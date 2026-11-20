from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from app.schemas.evidence import EvidenceItem


class CaseStatus(str, Enum):
    DRAFT = "DRAFT"
    IN_PREPARATION = "IN_PREPARATION"
    REVIEW_PENDING = "REVIEW_PENDING"
    APPROVED = "APPROVED"
    LIEN_REQUESTED = "LIEN_REQUESTED"
    SUBMITTED_TO_CYBER_CELL = "SUBMITTED_TO_CYBER_CELL"
    RECOVERED = "RECOVERED"
    CLOSED = "CLOSED"


class FraudCaseSummary(BaseModel):
    id: str
    case_number: str
    victim_id: str
    title: str
    fraud_category: str
    transaction_id_utr: Optional[str] = None
    amount_lost: float
    beneficiary_upi_id: Optional[str] = None
    beneficiary_bank: Optional[str] = None
    status: CaseStatus
    created_at: datetime
    updated_at: datetime
    golden_hour_active: bool = False
    evidence_count: int = 0


class FraudCaseDetail(FraudCaseSummary):
    fraud_description: str = ""
    incident_date: Optional[str] = None
    preferred_language: str = "en"
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    evidence_items: List[EvidenceItem] = Field(default_factory=list)


class DashboardStats(BaseModel):
    total_cases: int
    cases_in_preparation: int
    submitted_complaints: int
    total_amount_defrauded: float
    total_amount_recovered: float
    active_golden_hour_cases: int


class CreateCaseRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    fraud_category: str
    fraud_description: str = Field(..., min_length=10, max_length=3000)
    incident_date: Optional[str] = None
    amount_lost: float = Field(default=0.0, ge=0.0)
    transaction_id_utr: Optional[str] = None
    beneficiary_upi_id: Optional[str] = None
    beneficiary_bank: Optional[str] = None
    preferred_language: str = "en"
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
