from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    IN_REVIEW = "IN_REVIEW"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    HIGH_DISCREPANCY = "HIGH_DISCREPANCY"
    VERIFIED = "VERIFIED"


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"  # Missing UTR, Amount, or Beneficiary UPI ID (essential for 1930 / bank freeze)
    WARNING = "WARNING"    # Divergent dates, missing beneficiary bank, low confidence
    INFO = "INFO"          # Missing optional fields like sender bank or display name


class QualityIssueType(str, Enum):
    BLURRY_IMAGE = "BLURRY_IMAGE"
    UNREADABLE_TEXT = "UNREADABLE_TEXT"
    INCOMPLETE_RECEIPT = "INCOMPLETE_RECEIPT"
    DUPLICATE_FILE = "DUPLICATE_FILE"
    LOW_RESOLUTION = "LOW_RESOLUTION"
    MISSING_PAYMENT_PROOF = "MISSING_PAYMENT_PROOF"


class MissingFieldItem(BaseModel):
    field_key: str
    label: str
    severity: SeverityLevel
    reason: str
    requires_user_action: bool = True
    prompt_question: str


class InconsistentFieldItem(BaseModel):
    field_key: str
    label: str
    evidence_sources: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of {evidence_id, file_name, value, confidence, category}"
    )
    discrepancy_description: str
    severity: SeverityLevel
    suggested_resolution: Optional[str] = None


class EvidenceQualityIssue(BaseModel):
    evidence_id: str
    file_name: str
    issue_type: QualityIssueType
    severity: SeverityLevel
    message: str
    metric: Optional[str] = None
    is_blocking: bool = False


class DuplicateTransactionItem(BaseModel):
    transaction_id_utr: Optional[str] = None
    amount: Optional[float] = None
    evidence_ids: List[str] = Field(default_factory=list)
    file_names: List[str] = Field(default_factory=list)
    explanation: str
    is_identical_file: bool = False


class VerifiedFieldItem(BaseModel):
    field_key: str
    label: str
    value: Any
    confidence: float
    confidence_level: str
    source_evidence_ids: List[str] = Field(default_factory=list)
    source_file_names: List[str] = Field(default_factory=list)
    is_cross_verified: bool = False
    user_confirmed: bool = False


class ConfirmationNeededItem(BaseModel):
    field_key: str
    label: str
    current_value: Any
    confidence: float
    reason: str
    suggested_value: Optional[Any] = None


class CaseVerificationReport(BaseModel):
    id: str
    case_id: str
    case_number: str
    verification_status: VerificationStatus
    completeness_score: float = Field(default=0.0, ge=0.0, le=100.0)
    consistency_score: float = Field(default=0.0, ge=0.0, le=100.0)
    quality_score: float = Field(default=0.0, ge=0.0, le=100.0)
    overall_score: float = Field(default=0.0, ge=0.0, le=100.0)
    
    verified_fields: List[VerifiedFieldItem] = Field(default_factory=list)
    missing_fields: List[MissingFieldItem] = Field(default_factory=list)
    inconsistencies: List[InconsistentFieldItem] = Field(default_factory=list)
    quality_issues: List[EvidenceQualityIssue] = Field(default_factory=list)
    duplicate_transactions: List[DuplicateTransactionItem] = Field(default_factory=list)
    confirmation_needed: List[ConfirmationNeededItem] = Field(default_factory=list)
    
    evidence_count: int = 0
    is_citizen_verified: bool = False
    verified_by_user: Optional[str] = None
    verified_at: Optional[datetime] = None
    user_corrections: Dict[str, Any] = Field(default_factory=dict)
    citizen_notes: Optional[str] = None
    
    disclaimer: str = (
        "IMPORTANT LEGAL DISCLAIMER: A complete case does not mean the fraud is proven. "
        "Verification only evaluates the quality, completeness and consistency of submitted evidence."
    )
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ConfirmVerificationPayload(BaseModel):
    is_confirmed: bool = True
    user_corrections: Dict[str, Any] = Field(default_factory=dict)
    citizen_notes: Optional[str] = None
