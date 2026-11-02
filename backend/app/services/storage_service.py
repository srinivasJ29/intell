"""Document and artifact storage service abstraction (Local and S3/MinIO)."""

import hashlib
import os
import re
from abc import ABC, abstractmethod
from typing import BinaryIO, Optional, Tuple
import aiofiles
from backend.app.core.config import settings
from backend.app.core.exceptions import BadRequestException, NotFoundException

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
PDF_MAGIC_BYTES = b"%PDF-"


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and filesystem attacks."""
    # Remove directory paths
    clean_name = os.path.basename(filename)
    # Remove non-alphanumeric chars except dots, underscores, dashes
    clean_name = re.sub(r"[^\w\s\.-]", "", clean_name).strip()
    return clean_name or "document.pdf"


def validate_pdf_content(file_bytes: bytes) -> None:
    """Validate PDF magic bytes header and size constraints."""
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise BadRequestException(f"File size exceeds maximum allowable limit of 50MB.")
    if not file_bytes.startswith(PDF_MAGIC_BYTES):
        raise BadRequestException("Invalid file format. Uploaded file is not a valid PDF.")


class BaseStorageService(ABC):
    """Abstract interface for file persistence."""

    @abstractmethod
    async def save_file(self, workspace_id: str, filename: str, content: bytes) -> Tuple[str, str, int]:
        """Save bytes and return (storage_key, sha256_hash, file_size_bytes)."""
        pass

    @abstractmethod
    async def get_file_bytes(self, storage_key: str) -> bytes:
        """Retrieve stored file bytes."""
        pass

    @abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Delete file from storage."""
        pass

    @abstractmethod
    def get_local_path(self, storage_key: str) -> Optional[str]:
        """Return direct local filesystem path if stored locally."""
        pass


class LocalStorageService(BaseStorageService):
    """Local filesystem storage backend."""

    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    async def save_file(self, workspace_id: str, filename: str, content: bytes) -> Tuple[str, str, int]:
        validate_pdf_content(content)
        safe_name = sanitize_filename(filename)
        sha256 = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        rel_dir = os.path.join(workspace_id, sha256[:2])
        full_dir = os.path.join(self.base_dir, rel_dir)
        os.makedirs(full_dir, exist_ok=True)

        storage_key = os.path.join(rel_dir, f"{sha256}_{safe_name}").replace("\\", "/")
        full_path = os.path.join(self.base_dir, storage_key)

        async with aiofiles.open(full_path, "wb") as f:
            await f.write(content)

        return storage_key, sha256, file_size

    async def get_file_bytes(self, storage_key: str) -> bytes:
        full_path = os.path.join(self.base_dir, storage_key)
        if not os.path.exists(full_path):
            raise NotFoundException(f"Storage object '{storage_key}' not found")
        async with aiofiles.open(full_path, "rb") as f:
            return await f.read()

    async def delete_file(self, storage_key: str) -> bool:
        full_path = os.path.join(self.base_dir, storage_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    def get_local_path(self, storage_key: str) -> Optional[str]:
        full_path = os.path.join(self.base_dir, storage_key)
        if os.path.exists(full_path):
            return full_path
        return None


class S3StorageService(BaseStorageService):
    """S3 / MinIO compatible storage backend."""

    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket = settings.S3_BUCKET_NAME
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=self.bucket)
            except Exception:
                pass

    async def save_file(self, workspace_id: str, filename: str, content: bytes) -> Tuple[str, str, int]:
        validate_pdf_content(content)
        safe_name = sanitize_filename(filename)
        sha256 = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        storage_key = f"{workspace_id}/{sha256[:2]}/{sha256}_{safe_name}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=storage_key,
            Body=content,
            ContentType="application/pdf",
        )
        return storage_key, sha256, file_size

    async def get_file_bytes(self, storage_key: str) -> bytes:
        try:
            resp = self.client.get_object(Bucket=self.bucket, Key=storage_key)
            return resp["Body"].read()
        except Exception as e:
            raise NotFoundException(f"S3 object '{storage_key}' not found: {str(e)}")

    async def delete_file(self, storage_key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False

    def get_local_path(self, storage_key: str) -> Optional[str]:
        # S3 files do not have a persistent local path unless downloaded to cache
        return None


def get_storage_service() -> BaseStorageService:
    """Storage service provider factory."""
    if settings.STORAGE_BACKEND.lower() == "s3":
        try:
            return S3StorageService()
        except Exception:
            # Fall back gracefully to local storage if S3 endpoint is unreachable
            return LocalStorageService()
    return LocalStorageService()


storage_service = get_storage_service()

