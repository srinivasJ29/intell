"""Application-wide custom exceptions and HTTP error mappings."""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class IntelliResearchException(HTTPException):
    """Base exception for all IntelliResearch application errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "ERROR",
        headers: Optional[Dict[str, str]] = None,
        extra: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code
        self.extra = extra or {}


class NotFoundException(IntelliResearchException):
    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code=code)


class UnauthorizedException(IntelliResearchException):
    def __init__(
        self,
        detail: str = "Could not validate credentials",
        code: str = "UNAUTHORIZED",
        headers: Optional[Dict[str, str]] = None,
    ):
        auth_headers = {"WWW-Authenticate": "Bearer"}
        if headers:
            auth_headers.update(headers)
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code=code,
            headers=auth_headers,
        )


class ForbiddenException(IntelliResearchException):
    def __init__(self, detail: str = "Access denied to resource", code: str = "FORBIDDEN"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail, code=code)


class ConflictException(IntelliResearchException):
    def __init__(self, detail: str = "Resource conflict", code: str = "CONFLICT"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code=code)


class BadRequestException(IntelliResearchException):
    def __init__(self, detail: str = "Invalid request payload", code: str = "BAD_REQUEST"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail, code=code)


class InsufficientEvidenceException(IntelliResearchException):
    def __init__(
        self,
        detail: str = "Retrieved document context does not provide sufficient evidence to answer this question.",
        code: str = "INSUFFICIENT_EVIDENCE",
    ):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail, code=code)

