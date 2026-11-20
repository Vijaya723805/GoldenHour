from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ReportStatus(str, Enum):
    DRAFT = "DRAFT"
    REVIEW_PENDING = "REVIEW_PENDING"
    APPROVED_BY_USER = "APPROVED_BY_USER"
    ARCHIVED = "ARCHIVED"


class FraudCategory(str, Enum):
    FAKE_QR = "FAKE_QR_SCAM"
    LOTTERY_REWARD = "LOTTERY_REWARD_SCAM"
    REMOTE_ACCESS_APP = "REMOTE_ACCESS_APP"
    IMPERSONATION = "BANK_OR_OFFICIAL_IMPERSONATION"
    PHISHING_LINK = "PHISHING_PAYMENT_LINK"
    OLX_MARKETPLACE = "MARKETPLACE_ADVANCE_FEE"
    UNAUTHORIZED_DEBIT = "UNAUTHORIZED_DEBIT"
    OTHER = "OTHER"


class TransactionSummary(BaseModel):
    transaction_id_utr: Optional[str] = Field(None, description="12-digit UTR or Reference Number")
    amount: Optional[float] = Field(None, description="Amount in INR")
    timestamp: Optional[datetime] = Field(None, description="Time of fraudulent transaction")
    sender_upi_id: Optional[str] = Field(None, description="Victim's UPI ID or Bank account")
    beneficiary_upi_id: Optional[str] = Field(None, description="Fraudster's UPI ID or VPA")
    beneficiary_account: Optional[str] = Field(None, description="Fraudster's Account Number if visible")
    beneficiary_bank: Optional[str] = Field(None, description="Fraudster's bank IFSC or name")
    app_used: Optional[str] = Field(None, description="Google Pay, PhonePe, Paytm, BHIM, etc.")


class FraudReportDraftRequest(BaseModel):
    victim_name: str = Field(..., min_length=2, max_length=100)
    victim_phone: str = Field(..., pattern=r"^\+?[0-9]{10,13}$")
    victim_email: Optional[str] = None
    victim_bank_name: str = Field(..., min_length=2, max_length=100)
    incident_description: str = Field(..., min_length=10, max_length=3000)
    category: FraudCategory = FraudCategory.OTHER
    evidence_ids: List[str] = Field(default_factory=list)
    transaction: Optional[TransactionSummary] = None


class ComplaintDocument(BaseModel):
    format_type: str = Field("CYBER_CRIME_PORTAL", description="CYBER_CRIME_PORTAL or BANK_NODAL_OFFICER")
    title: str
    body_text: str
    action_items_for_victim: List[str]
    critical_disclaimer: str = (
        "MANDATORY USER REVIEW: This document is an AI-assisted draft. "
        "GoldenHour will NEVER automatically submit complaints or freeze accounts. "
        "Review all details for accuracy before submitting to the National Cyber Crime Reporting Portal (cybercrime.gov.in) or your bank."
    )


class FraudReportResponse(BaseModel):
    report_id: str
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    victim_name: str
    victim_phone: str
    category: FraudCategory
    transaction: Optional[TransactionSummary] = None
    complaint_drafts: List[ComplaintDocument] = Field(default_factory=list)
    user_approved: bool = False
    approval_timestamp: Optional[datetime] = None
