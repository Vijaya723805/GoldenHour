from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ActionStage(str, Enum):
    WITHIN_10_MINUTES = "WITHIN_10_MINUTES"
    WITHIN_1_HOUR = "WITHIN_1_HOUR"
    WITHIN_24_HOURS = "WITHIN_24_HOURS"


class TrackingStatus(str, Enum):
    CASE_INITIALIZED = "CASE_INITIALIZED"
    EVIDENCE_VERIFIED = "EVIDENCE_VERIFIED"
    REPORTED_TO_1930 = "REPORTED_TO_1930"
    BANK_DISPUTE_SUBMITTED = "BANK_DISPUTE_SUBMITTED"
    PORTAL_COMPLAINT_FILED = "PORTAL_COMPLAINT_FILED"
    UNDER_BANK_INVESTIGATION = "UNDER_BANK_INVESTIGATION"
    LIEN_INQUIRY_ACTIVE = "LIEN_INQUIRY_ACTIVE"
    FOLLOW_UP_COMPLETED = "FOLLOW_UP_COMPLETED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class EmergencyChecklistItem(BaseModel):
    id: str
    stage: ActionStage
    title: str
    description: str
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    category: Optional[str] = None


class TimelineEvent(BaseModel):
    id: str
    title: str
    description: str
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    reference_id: Optional[str] = None
    badge_variant: Optional[str] = "default"


class FollowUpNote(BaseModel):
    id: str
    note_text: str
    author: str = "Citizen Complainant"
    category: str = "General Follow-up"
    created_at: datetime = Field(default_factory=datetime.now)


class OfficialLinkItem(BaseModel):
    name: str
    url: str
    category: str
    description: str
    verified: bool = True
    helpline_number: Optional[str] = None
    badge_text: str = "Verified Official"


class ReadyDocumentItem(BaseModel):
    doc_type: str
    title: str
    description: str
    pdf_url: str
    view_url: str
    is_ready: bool = True
    recommended_stage: str = "WITHIN_10_MINUTES"


class FollowUpInfo(BaseModel):
    primary_bank_name: str
    primary_bank_helpline: str
    bank_fraud_email: str
    cybercrime_helpline: str = "1930"
    cybercrime_portal_url: str = "https://cybercrime.gov.in/"
    next_follow_up_target: Optional[str] = None
    recommended_action: str
    bank_nodal_advisory: str


class CaseTrackingDetail(BaseModel):
    case_id: str
    case_number: str
    victim_id: str
    title: str
    amount_lost: float
    transaction_id_utr: Optional[str] = None
    beneficiary_upi_id: Optional[str] = None
    beneficiary_bank: Optional[str] = None
    current_status: TrackingStatus
    created_at: datetime
    updated_at: datetime
    golden_hour_active: bool = False
    
    # Official Reference Numbers added manually by citizen
    ncrp_acknowledgement_token: Optional[str] = None
    ncrp_submission_confirmed: bool = False
    bank_dispute_sr_number: Optional[str] = None
    bank_submission_confirmed: bool = False
    police_station_ref: Optional[str] = None
    submission_confirmed_at: Optional[datetime] = None

    checklist_items: List[EmergencyChecklistItem] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    follow_up_notes: List[FollowUpNote] = Field(default_factory=list)
    ready_documents: List[ReadyDocumentItem] = Field(default_factory=list)
    follow_up_info: Optional[FollowUpInfo] = None
    important_next_actions: List[str] = Field(default_factory=list)

    disclaimer: str = (
        "IMPORTANT LEGAL NOTICE: These action stages represent recommended response targets to maximize recovery chances, "
        "not guaranteed legal deadlines. GoldenHour does not claim complaints have been submitted unless confirmed by the user. "
        "Only banks and authorized authorities decide on freezing funds or recovering transactions."
    )


class EmergencyDashboardData(BaseModel):
    case_id: str
    case_number: str
    current_status: TrackingStatus
    case_created_at: datetime
    golden_hour_active: bool
    amount_lost: float
    transaction_id_utr: Optional[str] = None
    beneficiary_upi_id: Optional[str] = None
    important_next_actions: List[str]
    pending_checklist_items: List[EmergencyChecklistItem]
    completed_checklist_count: int
    total_checklist_count: int
    completion_percentage: int
    ready_documents: List[ReadyDocumentItem]
    follow_up_info: FollowUpInfo
    reference_numbers: Dict[str, Optional[str]]
    official_links: List[OfficialLinkItem]
    disclaimer: str


class AddNoteRequest(BaseModel):
    note_text: str = Field(..., min_length=2, max_length=1500)
    category: Optional[str] = "General Follow-up"


class UpdateReferenceNumbersRequest(BaseModel):
    ncrp_token: Optional[str] = None
    bank_sr_number: Optional[str] = None
    police_ref: Optional[str] = None
    confirm_ncrp_submitted: Optional[bool] = None
    confirm_bank_submitted: Optional[bool] = None


class UpdateTrackingStatusRequest(BaseModel):
    status: TrackingStatus
    status_change_note: Optional[str] = None


class ToggleChecklistItemRequest(BaseModel):
    is_completed: bool
