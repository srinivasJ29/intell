"""Authentication, password hashing, and JWT token rotation tests."""

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from backend.app.core.database import Base, get_db
from backend.app.core.security import verify_password, decode_access_token
from backend.app.main import app
from backend.app.models.user import User
from backend.app.models.session import RefreshTokenSession

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_client():
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
        yield client, session_maker

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_registration_and_login_flow(async_client):
    client, session_maker = async_client

    # 1. Register new user
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dr.vance@physics.mit.edu",
            "password": "UltraSecurePassword2026!",
            "full_name": "Dr. Elena Vance",
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data

    # Verify access token payload
    decoded = decode_access_token(reg_data["access_token"])
    assert decoded is not None
    user_id = decoded["sub"]

    # 2. Duplicate registration should return 409 Conflict
    dup_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dr.vance@physics.mit.edu",
            "password": "AnotherPassword123!",
        },
    )
    assert dup_resp.status_code == 409

    # 3. Successful Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "dr.vance@physics.mit.edu",
            "password": "UltraSecurePassword2026!",
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data

    # 4. Get Current User Profile
    auth_headers = {"Authorization": f"Bearer {login_data['access_token']}"}
    me_resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200
    user_info = me_resp.json()
    assert user_info["email"] == "dr.vance@physics.mit.edu"
    assert user_info["full_name"] == "Dr. Elena Vance"

    # 5. Refresh Token Rotation
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_data["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert new_tokens["access_token"] != login_data["access_token"]
    assert new_tokens["refresh_token"] != login_data["refresh_token"]

    # 6. Reusing old refresh token must fail (Token Revocation / Replay Protection)
    stale_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_data["refresh_token"]},
    )
    assert stale_resp.status_code == 401
