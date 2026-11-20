from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class EvidenceCategory(str, Enum):
    UPI_RECEIPT = "UPI_RECEIPT"
    BANK_STATEMENT = "BANK_STATEMENT"
    SMS_ALERT = "SMS_ALERT"
    WHATSAPP_CHAT = "WHATSAPP_CHAT"
    OTHER = "OTHER"


class EvidenceItem(BaseModel):
    id: str
    case_id: str
    file_name: str
    sanitized_file_name: str
    file_size_bytes: int
    content_type: str
    category: EvidenceCategory = EvidenceCategory.OTHER
    description: Optional[str] = None
    storage_location: str = "private_vault"
    storage_path: str
    created_at: datetime
    has_preview: bool = True


class ExtractedTransactionData(BaseModel):
    transaction_id_utr: Optional[str] = Field(None, description="12-digit UTR or Reference number")
    amount: Optional[float] = Field(None, description="Amount in INR")
    timestamp: Optional[str] = Field(None, description="Date & time of transaction")
    sender_upi_id: Optional[str] = Field(None, description="Victim UPI ID or Bank Account")
    beneficiary_upi_id: Optional[str] = Field(None, description="Fraudster UPI VPA")
    beneficiary_account: Optional[str] = Field(None, description="Fraudster account number if visible")
    beneficiary_bank: Optional[str] = Field(None, description="Beneficiary Bank name")
    app_used: Optional[str] = Field(None, description="PhonePe, Google Pay, Paytm, BHIM, etc.")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)


class EvidenceUploadResponse(BaseModel):
    evidence_id: str
    case_id: str
    filename: str
    file_size: int
    content_type: str
    category: EvidenceCategory
    storage_location: str
    upload_timestamp: str = ""


class EvidenceAnalysisResponse(BaseModel):
    evidence_id: str
    transaction: ExtractedTransactionData
    detected_category: str = "UNAUTHORIZED_DEBIT"
    raw_text_summary: str = ""
    redacted_sensitive_data: bool = True
    security_flags: List[str] = Field(default_factory=list)
