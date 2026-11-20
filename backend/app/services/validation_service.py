import re
from typing import Dict, Any, Tuple
from app.core.security import contains_sensitive_credentials, redact_sensitive_text
from app.core.exceptions import SensitiveDataViolationException


class ValidationService:
    @staticmethod
    def inspect_and_sanitize_text(text: str) -> Tuple[str, bool]:
        """
        Scans text for sensitive credentials (PINs, OTPs, CVVs).
        Returns sanitized text and a boolean flag indicating if credentials were removed.
        """
        if not text:
            return "", False

        has_sensitive, reason = contains_sensitive_credentials(text)
        if has_sensitive:
            sanitized = redact_sensitive_text(text)
            return sanitized, True
        return text, False

    @staticmethod
    def validate_utr(utr: str) -> bool:
        """UTR is typically a 12-digit numeric or alphanumeric bank reference number."""
        if not utr:
            return False
        clean_utr = utr.strip()
        return bool(re.match(r"^[0-9A-Za-z]{12}$", clean_utr))

    @staticmethod
    def validate_upi_id(vpa: str) -> bool:
        """Validates UPI ID structure (e.g., username@bank)."""
        if not vpa:
            return False
        return bool(re.match(r"^[\w\.\-]+@[\w\-]+$", vpa.strip()))


validation_service = ValidationService()
