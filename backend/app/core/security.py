import re
import os
import uuid
from typing import Tuple, List
from fastapi import UploadFile

from app.core.config import settings

# Allowed MIME types for digital evidence
ALLOWED_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "application/octet-stream"  # Browser fallback for some binary image blobs
]

# Sensitive credential detection patterns (regex)
SENSITIVE_PATTERNS = [
    # UPI PIN patterns (typically 4 or 6 digits explicitly labeled as PIN)
    (re.compile(r'\b(?:upi\s*pin|mpin|pin)[\s:=]+(\d{4,6})\b', re.IGNORECASE), "[REDACTED-PIN]"),
    # OTP patterns (4 to 8 digits explicitly labeled as OTP)
    (re.compile(r'\b(?:otp|one\s*time\s*password|verification\s*code)[\s:=]+(\d{4,8})\b', re.IGNORECASE), "[REDACTED-OTP]"),
    # CVV / CVC patterns
    (re.compile(r'\b(?:cvv|cvc|security\s*code)[\s:=]+(\d{3,4})\b', re.IGNORECASE), "[REDACTED-CVV]"),
    # Passwords
    (re.compile(r'\b(?:password|passwd|pwd)[\s:=]+([^\s]+)\b', re.IGNORECASE), "[REDACTED-PASSWORD]"),
]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize and create a safe randomized unique filename
    to avoid path traversal, overwrites, or malformed characters.
    """
    base_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', base_name)
    ext = clean_name.split('.')[-1].lower() if '.' in clean_name else "bin"
    unique_id = uuid.uuid4().hex[:12]
    return f"{unique_id}_{clean_name}"


def validate_file_extension(filename: str) -> bool:
    """Checks if file extension is allowed."""
    if not filename or '.' not in filename:
        return False
    ext = filename.split('.')[-1].lower()
    return ext in settings.ALLOWED_EXTENSIONS


def validate_mime_type(content_type: str) -> bool:
    """Checks if the MIME type is within the permitted evidence whitelist."""
    if not content_type:
        return False
    clean_mime = content_type.split(";")[0].strip().lower()
    return clean_mime in ALLOWED_MIME_TYPES


def validate_file_safety(file: UploadFile, max_size_bytes: int = None) -> Tuple[bool, str]:
    """Validates uploaded file against allowed extensions and MIME types."""
    if not file.filename:
        return False, "Filename cannot be empty"

    if not validate_file_extension(file.filename):
        return False, f"File extension not permitted. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"

    if file.content_type and not validate_mime_type(file.content_type):
        return False, f"File MIME type '{file.content_type}' is not supported."

    return True, "Valid"


def scan_for_forbidden_credentials(text: str) -> List[str]:
    """Scans text for forbidden keywords or credential disclosures like UPI PINs or OTPs."""
    violations = []
    text_lower = text.lower()

    for keyword in settings.FORBIDDEN_KEYWORDS:
        if keyword in text_lower:
            violations.append(f"Contains prohibited sensitive credential keyword: '{keyword}'")

    for pattern, _ in SENSITIVE_PATTERNS:
        if pattern.search(text):
            violations.append("Contains pattern resembling sensitive credentials (PIN/OTP/CVV)")
            break

    return violations


def contains_sensitive_credentials(text: str) -> Tuple[bool, List[str]]:
    """Returns True if any prohibited credentials or keywords exist."""
    violations = scan_for_forbidden_credentials(text)
    return len(violations) > 0, violations


def redact_sensitive_credentials(text: str) -> str:
    """Redacts any accidental PIN, OTP, CVV, or password disclosures from extracted text."""
    sanitized = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


def redact_sensitive_text(text: str) -> str:
    """Alias for redact_sensitive_credentials."""
    return redact_sensitive_credentials(text)
