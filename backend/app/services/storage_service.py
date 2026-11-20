import os
import uuid
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from fastapi import UploadFile
from app.core.config import settings
from app.core.security import sanitize_filename, validate_file_extension, validate_mime_type
from app.core.exceptions import InvalidFileException
from app.db.supabase_client import db_manager


class StorageService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_case_evidence(
        self, file: UploadFile, case_id: str, category: str = "OTHER"
    ) -> Dict[str, Any]:
        """
        Validates and stores digital evidence within a case-isolated secure directory.
        Zero-public access: Files are placed in private storage only.
        """
        if not file.filename:
            raise InvalidFileException("Filename cannot be empty.")

        # 1. Validate file extension
        if not validate_file_extension(file.filename):
            raise InvalidFileException(
                f"File format not supported. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # 2. Validate MIME type
        content_type = file.content_type or "application/octet-stream"
        if not validate_mime_type(content_type):
            raise InvalidFileException(f"Unsupported MIME type: {content_type}")

        # 3. Read content and enforce size limits (Max 15MB)
        content = await file.read()
        file_size = len(content)

        if file_size > settings.max_upload_bytes:
            raise InvalidFileException(
                f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        if file_size == 0:
            raise InvalidFileException("Uploaded file is empty (0 bytes).")

        # 4. Generate unique identifier & sanitized name
        evidence_id = str(uuid.uuid4())
        safe_name = sanitize_filename(file.filename)
        saved_filename = f"{evidence_id}_{safe_name}"

        # 5. Local secure case directory
        case_dir = self.upload_dir / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        local_path = case_dir / saved_filename

        with open(local_path, "wb") as f:
            f.write(content)

        # 6. Supabase Private Storage Bucket (evidence-vault)
        storage_location = "local_private_vault"
        storage_path = str(local_path)
        supabase_bucket_path = None

        if db_manager.is_connected and db_manager.client:
            try:
                bucket_name = settings.SUPABASE_BUCKET_EVIDENCE or "evidence-vault"
                cloud_dest = f"{case_id}/{saved_filename}"
                db_manager.client.storage.from_(bucket_name).upload(
                    path=cloud_dest,
                    file=content,
                    file_options={"content-type": content_type, "upsert": "false"}
                )
                storage_location = "supabase_private_bucket"
                supabase_bucket_path = cloud_dest
            except Exception:
                # Fallback to local private vault if cloud is unreachable
                storage_location = "local_private_fallback"

        return {
            "evidence_id": evidence_id,
            "case_id": case_id,
            "original_filename": file.filename,
            "sanitized_filename": saved_filename,
            "file_size": file_size,
            "content_type": content_type,
            "category": category,
            "local_path": str(local_path),
            "storage_path": supabase_bucket_path or str(local_path),
            "storage_location": storage_location,
        }

    def delete_evidence_file(self, local_path: str, storage_path: Optional[str] = None) -> bool:
        """Removes the file from local storage and Supabase private bucket."""
        deleted = False

        # Remove local file
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
                deleted = True
            except OSError:
                pass

        # Remove from Supabase private storage if configured
        if db_manager.is_connected and db_manager.client and storage_path:
            try:
                bucket_name = settings.SUPABASE_BUCKET_EVIDENCE or "evidence-vault"
                db_manager.client.storage.from_(bucket_name).remove([storage_path])
                deleted = True
            except Exception:
                pass

        return deleted

    def get_file_content(self, local_path: str) -> Optional[bytes]:
        """Reads local file content for authenticated preview streaming."""
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return None


storage_service = StorageService()
