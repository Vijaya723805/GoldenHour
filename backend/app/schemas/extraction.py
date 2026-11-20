from datetime import datetime
from typing import Optional, List, Dict, Any, Generic, TypeVar
from pydantic import BaseModel, Field
from enum import Enum


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"         # >= 0.85 (Clear visual + OCR agreement)
    MEDIUM = "MEDIUM"     # 0.50 - 0.84 (Detected by one engine or slightly ambiguous)
    LOW = "LOW"           # < 0.50 (Noisy image or partial match)
    NOT_FOUND = "NOT_FOUND" # Null / Not present in evidence


T = TypeVar("T")


class ExtractedField(BaseModel, Generic[T]):
    value: Optional[T] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence_level: ConfidenceLevel = ConfidenceLevel.NOT_FOUND
    source: str = Field(default="not_detected", description="claude_vision, paddleocr, rule_engine, cross_verified")
    raw_match: Optional[str] = None
    uncertainty_note: Optional[str] = None


class ExtractedTransactionDetails(BaseModel):
    transaction_id_utr: ExtractedField[str] = Field(default_factory=ExtractedField)
    amount: ExtractedField[float] = Field(default_factory=ExtractedField)
    transaction_date: ExtractedField[str] = Field(default_factory=ExtractedField)
    transaction_time: ExtractedField[str] = Field(default_factory=ExtractedField)
    sender_upi_id: ExtractedField[str] = Field(default_factory=ExtractedField)
    sender_name: ExtractedField[str] = Field(default_factory=ExtractedField)
    sender_bank: ExtractedField[str] = Field(default_factory=ExtractedField)
    beneficiary_upi_id: ExtractedField[str] = Field(default_factory=ExtractedField)
    beneficiary_name: ExtractedField[str] = Field(default_factory=ExtractedField)
    beneficiary_bank: ExtractedField[str] = Field(default_factory=ExtractedField)
    beneficiary_account: ExtractedField[str] = Field(default_factory=ExtractedField)
    app_used: ExtractedField[str] = Field(default_factory=ExtractedField)


class ExtractedCommunicationDetails(BaseModel):
    sender_phone_number: ExtractedField[str] = Field(default_factory=ExtractedField)
    sender_display_name: ExtractedField[str] = Field(default_factory=ExtractedField)
    is_sender_spoofed: ExtractedField[bool] = Field(default_factory=ExtractedField)
    whatsapp_contact_info: ExtractedField[str] = Field(default_factory=ExtractedField)
    conversation_timestamps: List[str] = Field(default_factory=list)
    suspicious_payment_instructions: List[str] = Field(default_factory=list)
    raw_message_transcript: Optional[str] = None


class ConflictItem(BaseModel):
    field_name: str
    conflicting_values: List[Dict[str, Any]]
    explanation: str
    recommended_action: str


class EvidenceExtractionResult(BaseModel):
    id: str
    case_id: str
    evidence_id: str
    evidence_file_name: str
    evidence_category: str
    transaction_info: ExtractedTransactionDetails
    communication_info: ExtractedCommunicationDetails
    raw_ocr_text: str
    visual_analysis_summary: str
    conflicts_detected: List[ConflictItem] = Field(default_factory=list)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    zero_credential_sanitized: bool = True
    user_verified: bool = False
    user_corrections: Dict[str, Any] = Field(default_factory=dict)
    extracted_at: datetime
    ocr_engine_used: str = "paddleocr"
    vision_engine_used: str = "claude-3-5-sonnet-vision"


class UserVerificationRequest(BaseModel):
    user_verified: bool = True
    corrections: Dict[str, Any] = Field(default_factory=dict)
    feedback_notes: Optional[str] = None
