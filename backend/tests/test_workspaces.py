"""Workspace CRUD and multi-tenant isolation tests."""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.core.database import Base, get_db
from backend.app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_env():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    
    from sqlalchemy import event
    @event.listens_for(engine.sync_engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create User 1
        r1 = await client.post(
            "/api/v1/auth/register",
            json={"email": "user1@research.org", "password": "Password123!", "full_name": "User One"},
        )
        token1 = r1.json()["access_token"]

        # Create User 2
        r2 = await client.post(
            "/api/v1/auth/register",
            json={"email": "user2@research.org", "password": "Password123!", "full_name": "User Two"},
        )
        token2 = r2.json()["access_token"]

        yield client, token1, token2

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_workspace_crud_and_tenant_isolation(test_env):
    client, token1, token2 = test_env
    h1 = {"Authorization": f"Bearer {token1}"}
    h2 = {"Authorization": f"Bearer {token2}"}

    # 1. User 1 creates a workspace
    ws_resp = await client.post(
        "/api/v1/workspaces/",
        json={
            "name": "Diffusion Models & Generative AI",
            "description": "Latent diffusion vs autoregressive models",
            "color_tag": "#111111",
        },
        headers=h1,
    )
    assert ws_resp.status_code == 201
    ws_data = ws_resp.json()
    ws_id = ws_data["id"]
    assert ws_data["name"] == "Diffusion Models & Generative AI"

    # 2. User 1 lists workspaces -> sees 1
    list1 = await client.get("/api/v1/workspaces/", headers=h1)
    assert list1.status_code == 200
    assert len(list1.json()) == 1

    # 3. User 2 lists workspaces -> sees 0 (Tenant Isolation)
    list2 = await client.get("/api/v1/workspaces/", headers=h2)
    assert list2.status_code == 200
    assert len(list2.json()) == 0

    # 4. User 2 attempts to get User 1's workspace -> 404 Not Found
    forbidden_get = await client.get(f"/api/v1/workspaces/{ws_id}", headers=h2)
    assert forbidden_get.status_code == 404

    # 5. User 1 updates workspace
    patch_resp = await client.patch(
        f"/api/v1/workspaces/{ws_id}",
        json={"name": "Diffusion Models & Flow Matching"},
        headers=h1,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Diffusion Models & Flow Matching"

    # 6. User 1 deletes workspace
    del_resp = await client.delete(f"/api/v1/workspaces/{ws_id}", headers=h1)
    assert del_resp.status_code == 204

    # 7. Workspace no longer exists
    get_after = await client.get(f"/api/v1/workspaces/{ws_id}", headers=h1)
    assert get_after.status_code == 404

