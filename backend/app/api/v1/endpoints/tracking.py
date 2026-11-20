from typing import Optional, List, Any
from fastapi import APIRouter, Header, HTTPException, status, Body

from app.schemas.common import ApiResponse
from app.schemas.case_tracking import (
    CaseTrackingDetail,
    EmergencyDashboardData,
    OfficialLinkItem,
    AddNoteRequest,
    UpdateReferenceNumbersRequest,
    UpdateTrackingStatusRequest,
    ToggleChecklistItemRequest
)
from app.services.case_tracking_service import case_tracking_service, DEFAULT_OFFICIAL_LINKS
from app.services.auth_service import auth_service
from app.services.dashboard_service import dashboard_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return "demo_session_token"


@router.get("/cases/{case_id}", response_model=ApiResponse[CaseTrackingDetail])
def get_case_tracking_detail(case_id: str, authorization: Optional[str] = Header(None)):
    """
    Module 7: Emergency Response and Case Tracking.
    Retrieves complete tracking details, emergency checklist (10 min, 1 hr, 24 hr),
    case timeline, manual reference numbers, follow-up notes, and documents.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    tracking = case_tracking_service.get_case_tracking(case_id, victim_id)
    return ApiResponse(
        success=True,
        message=f"Tracking details loaded for case '{tracking.case_number}'.",
        data=tracking
    )


@router.get("/cases/{case_id}/dashboard", response_model=ApiResponse[EmergencyDashboardData])
def get_emergency_dashboard(case_id: str, authorization: Optional[str] = Header(None)):
    """
    Module 7: Emergency Dashboard.
    Provides real-time case status, prioritized next actions, pending checklist items,
    ready download documents, follow-up details, and verified official links.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    data = case_tracking_service.get_emergency_dashboard(case_id, victim_id)
    return ApiResponse(
        success=True,
        message="Emergency dashboard data loaded.",
        data=data
    )


@router.put("/cases/{case_id}/reference-numbers", response_model=ApiResponse[CaseTrackingDetail])
def update_reference_numbers(
    case_id: str,
    payload: UpdateReferenceNumbersRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Allows citizens to manually log official complaint reference numbers:
    - 1930 NCRP Acknowledgement Token
    - Bank Dispute Service Request (SR) number
    - Police station GD / FIR reference
    Strictly records confirmation only when entered by complainant.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    tracking = case_tracking_service.update_reference_numbers(
        case_id=case_id,
        victim_id=victim_id,
        ncrp_token=payload.ncrp_token,
        bank_sr_number=payload.bank_sr_number,
        police_ref=payload.police_ref,
        confirm_ncrp_submitted=payload.confirm_ncrp_submitted,
        confirm_bank_submitted=payload.confirm_bank_submitted
    )
    return ApiResponse(
        success=True,
        message="Official complaint reference numbers saved.",
        data=tracking
    )


@router.put("/cases/{case_id}/status", response_model=ApiResponse[CaseTrackingDetail])
def update_case_status(
    case_id: str,
    payload: UpdateTrackingStatusRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Updates citizen follow-up status (e.g. REPORTED_TO_1930, BANK_DISPUTE_SUBMITTED,
    UNDER_BANK_INVESTIGATION, LIEN_INQUIRY_ACTIVE, RESOLVED) and creates a timeline event.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    tracking = case_tracking_service.update_tracking_status(
        case_id=case_id,
        victim_id=victim_id,
        new_status=payload.status,
        note=payload.status_change_note
    )
    return ApiResponse(
        success=True,
        message=f"Case status updated to '{payload.status.value}'.",
        data=tracking
    )


@router.post("/cases/{case_id}/notes", response_model=ApiResponse[CaseTrackingDetail])
def add_follow_up_note(
    case_id: str,
    payload: AddNoteRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Adds a follow-up note to the case (e.g., summary of bank phone call or branch visit).
    Chronologically archives note and updates action timeline.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    tracking = case_tracking_service.add_follow_up_note(
        case_id=case_id,
        victim_id=victim_id,
        note_text=payload.note_text,
        category=payload.category or "General Follow-up"
    )
    return ApiResponse(
        success=True,
        message="Follow-up note logged successfully.",
        data=tracking
    )


@router.post("/cases/{case_id}/checklist/{item_id}/toggle", response_model=ApiResponse[CaseTrackingDetail])
def toggle_checklist_item(
    case_id: str,
    item_id: str,
    payload: ToggleChecklistItemRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Marks an action checklist item as completed or incomplete.
    Automatically logs a corresponding event in the case timeline.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    try:
        tracking = case_tracking_service.toggle_checklist_item(
            case_id=case_id,
            victim_id=victim_id,
            item_id=item_id,
            is_completed=payload.is_completed
        )
        return ApiResponse(
            success=True,
            message="Checklist item updated.",
            data=tracking
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/official-links", response_model=ApiResponse[List[OfficialLinkItem]])
def get_official_reporting_links():
    """
    Returns verified official reporting links:
    - National Cybercrime Reporting Portal: https://cybercrime.gov.in/
    - Cybercrime Helpline: 1930
    - Major Indian Bank cyber dispute desks
    """
    return ApiResponse(
        success=True,
        message="Official reporting links retrieved.",
        data=DEFAULT_OFFICIAL_LINKS
    )
