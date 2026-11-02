"""Research conversation and streaming hybrid RAG chat endpoints."""

import json
from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, get_workspace_for_user
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.models.conversation import Conversation, Message
from backend.app.schemas.chat import (
    ChatQueryRequest,
    ConversationDetailResponse,
    ConversationResponse,
    MessageResponse,
)
from backend.app.services.rag_service import rag_engine

router = APIRouter(tags=["AI Research Assistant"])


@router.post("/workspaces/{workspace_id}/chat")
async def chat_with_research_assistant(
    workspace_id: str,
    payload: ChatQueryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Ask an evidence-grounded research question across workspace papers with SSE streaming."""
    # Verify workspace ownership
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        from backend.app.core.exceptions import NotFoundException
        raise NotFoundException(f"Workspace {workspace_id} not found")

    # 1. Resolve or create Conversation
    conversation_id = payload.conversation_id
    if not conversation_id:
        title_snippet = payload.query[:45].strip() + ("..." if len(payload.query) > 45 else "")
        conv = Conversation(
            workspace_id=workspace.id,
            user_id=current_user.id,
            title=title_snippet or "Research Inquiry",
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conversation_id = conv.id

    # 2. Record User Message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=payload.query,
        citations_json=[],
        token_count=len(payload.query.split()),
    )
    db.add(user_msg)
    await db.commit()

    # 3. Stream generator closure
    async def sse_event_stream():
        accumulated_tokens = []
        final_citations = []

        try:
            async for chunk in rag_engine.stream_rag_answer(
                workspace_id=workspace.id,
                user_id=current_user.id,
                query=payload.query,
                document_ids=payload.document_ids,
            ):
                if chunk["type"] == "token":
                    accumulated_tokens.append(chunk["content"])
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk["type"] == "done":
                    final_citations = chunk.get("citations", [])

            complete_answer = "".join(accumulated_tokens)

            # Persist Assistant Message in independent database session
            from backend.app.core.database import async_session_factory
            async with async_session_factory() as write_db:
                asst_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=complete_answer,
                    citations_json=final_citations,
                    token_count=len(complete_answer.split()),
                )
                write_db.add(asst_msg)
                await write_db.commit()
                await write_db.refresh(asst_msg)
                asst_msg_id = asst_msg.id

            done_payload = {
                "type": "done",
                "conversation_id": conversation_id,
                "message_id": asst_msg_id,
                "citations": final_citations,
            }
            yield f"data: {json.dumps(done_payload)}\n\n"

        except Exception as e:
            err_payload = {"type": "error", "content": str(e)}
            yield f"data: {json.dumps(err_payload)}\n\n"

    return StreamingResponse(
        sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/workspaces/{workspace_id}/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    workspace_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all research conversations in a workspace."""
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == current_user.id,
        )
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve full conversation message turns and citations."""
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        from backend.app.core.exceptions import NotFoundException
        raise NotFoundException(f"Conversation {conversation_id} not found")

    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    messages = msgs_result.scalars().all()

    return ConversationDetailResponse(
        id=conv.id,
        workspace_id=conv.workspace_id,
        user_id=conv.user_id,
        title=conv.title,
        message_count=len(messages),
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a conversation thread and its message turns."""
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conv = conv_result.scalar_one_or_none()
    if conv:
        await db.delete(conv)
        await db.commit()

