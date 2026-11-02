"""Consolidated v1 API Router."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    analytics,
    auth,
    chat,
    comparisons,
    documents,
    reports,
    workspaces,
)

api_router = APIRouter(prefix="/v1")

api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(comparisons.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
