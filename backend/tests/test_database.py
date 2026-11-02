"""Database models, relationships, cascades, and transaction tests."""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.session import RefreshTokenSession
from backend.app.models.workspace import Workspace
from backend.app.models.document import Document, DocumentProcessingJob
from backend.app.models.conversation import Conversation, Message
from backend.app.models.report import ResearchReport
from backend.app.core.security import hash_password, hash_token, generate_refresh_token


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """Create in-memory async SQLite engine and initialize schema for tests."""
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    from sqlalchemy import event
    @event.listens_for(test_engine.sync_engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_user_and_session_creation(db_session: AsyncSession):
    """Test user registration and refresh token session persistence."""
    hashed_pw = hash_password("SecurePassword123!")
    user = User(
        email="researcher@mit.edu",
        hashed_password=hashed_pw,
        full_name="Dr. Elena Vance",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.email == "researcher@mit.edu"
    assert user.created_at is not None

    # Create refresh token session
    raw_token = generate_refresh_token()
    token_hash = hash_token(raw_token)
    session = RefreshTokenSession(
        user_id=user.id,
        token_hash=token_hash,
        user_agent="Mozilla/5.0 Chrome/120.0",
        client_ip="127.0.0.1",
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)

    assert session.id is not None
    assert session.user_id == user.id
    assert session.is_revoked is False


@pytest.mark.asyncio
async def test_workspace_and_cascade_relationships(db_session: AsyncSession):
    """Test workspace creation, document ingestion tracking, chat, and cascade deletions."""
    # 1. Create User
    user = User(
        email="analyst@industry.com",
        hashed_password=hash_password("Password987!"),
        full_name="Marcus Chen",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 2. Create Workspace
    workspace = Workspace(
        user_id=user.id,
        name="Attention Mechanisms & Transformers",
        description="Investigation of linear and sparse attention",
        color_tag="#111111",
    )
    db_session.add(workspace)
    await db_session.commit()
    await db_session.refresh(workspace)

    # 3. Create Document
    doc = Document(
        workspace_id=workspace.id,
        user_id=user.id,
        title="Attention Is All You Need",
        filename="attention_is_all_you_need.pdf",
        storage_key="docs/attention.pdf",
        file_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size_bytes=2211840,
        page_count=15,
        status="READY",
        metadata_json={"author": "Vaswani et al.", "year": 2017},
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)

    # 4. Create Processing Job
    job = DocumentProcessingJob(
        document_id=doc.id,
        stage="INDEXING",
        status="COMPLETED",
        progress_percent=100.0,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(job)
    await db_session.commit()

    # 5. Create Conversation & Message
    conv = Conversation(
        workspace_id=workspace.id,
        user_id=user.id,
        title="Multi-Head Attention Inquiries",
    )
    db_session.add(conv)
    await db_session.commit()
    await db_session.refresh(conv)

    msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content="Multi-Head Attention allows the model to jointly attend to information from different representation subspaces.",
        citations_json=[
            {
                "document_id": doc.id,
                "document_title": doc.title,
                "page_number": 4,
                "snippet": "Multi-head attention allows the model...",
            }
        ],
        token_count=42,
    )
    db_session.add(msg)
    await db_session.commit()

    # 6. Create Research Report
    report = ResearchReport(
        workspace_id=workspace.id,
        user_id=user.id,
        title="Comparative Synthesis of Attention Variants",
        report_type="COMPREHENSIVE",
        content_markdown="# Transformer Attention Synthesis\n...",
        source_document_ids=[doc.id],
    )
    db_session.add(report)
    await db_session.commit()

    # Verify query relationships
    result = await db_session.execute(
        select(Document).where(Document.workspace_id == workspace.id)
    )
    docs = result.scalars().all()
    assert len(docs) == 1
    assert docs[0].title == "Attention Is All You Need"

    # Verify message citations
    result = await db_session.execute(
        select(Message).where(Message.conversation_id == conv.id)
    )
    messages = result.scalars().all()
    assert len(messages) == 1
    assert messages[0].citations_json[0]["page_number"] == 4

    # 7. Test Cascade Delete: deleting workspace must delete doc, jobs, conversations, messages, reports
    await db_session.delete(workspace)
    await db_session.commit()

    docs_after = (await db_session.execute(select(Document).where(Document.workspace_id == workspace.id))).scalars().all()
    assert len(docs_after) == 0

    convs_after = (await db_session.execute(select(Conversation).where(Conversation.workspace_id == workspace.id))).scalars().all()
    assert len(convs_after) == 0

    reports_after = (await db_session.execute(select(ResearchReport).where(ResearchReport.workspace_id == workspace.id))).scalars().all()
    assert len(reports_after) == 0
