from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ComplaintDocType(str, Enum):
    BANK_FRAUD_COMPLAINT = "BANK_FRAUD_COMPLAINT"
    BANK_FREEZE_REQUEST = "BANK_FREEZE_REQUEST"
    HELPLINE_1930_SCRIPT = "HELPLINE_1930_SCRIPT"
    CYBERCRIME_PORTAL_DRAFT = "CYBERCRIME_PORTAL_DRAFT"


class DocumentLanguage(str, Enum):
    EN = "en"
    TE = "te"
    HI = "hi"


class GeneratedDocument(BaseModel):
    doc_type: ComplaintDocType
    title: str
    language: DocumentLanguage = DocumentLanguage.EN
    content: str
    structured_fields: Dict[str, Any] = Field(default_factory=dict)
    missing_fields: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "IMPORTANT LEGAL NOTICE: This document is an AI-generated draft prepared for the citizen's review. "
        "GoldenHour never automatically submits complaints or directly freezes accounts. "
        "Only the respective bank or law enforcement authority has legal jurisdiction to freeze or lien an account."
    )
    is_user_edited: bool = False
    generated_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class CaseComplaintBundle(BaseModel):
    case_id: str
    case_number: str
    language: DocumentLanguage = DocumentLanguage.EN
    documents: Dict[str, GeneratedDocument] = Field(default_factory=dict)
    missing_information_summary: List[str] = Field(default_factory=list)
    overall_verified_score: float = 0.0
    citizen_approved: bool = False
    citizen_approval_timestamp: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class UpdateComplaintDraftPayload(BaseModel):
    content: str
    is_user_edited: bool = True


class GenerateComplaintsRequest(BaseModel):
    language: DocumentLanguage = DocumentLanguage.EN
    regenerate: bool = False
