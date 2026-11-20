from typing import Optional, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.verification import (
    CaseVerificationReport,
    ConfirmVerificationPayload
)
from app.services.verification_service import verification_service
from app.services.dashboard_service import dashboard_service
from app.services.auth_service import auth_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.post("/cases/{case_id}/verify", response_model=ApiResponse[CaseVerificationReport])
def trigger_case_verification(
    case_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Executes the Smart Evidence Verification Engine across all evidence files
    associated with the specified case.
    Evaluates:
    - Missing information detection
    - Cross-evidence inconsistency detection
    - Evidence quality and blur analysis
    - Confidence assessment and duplicate transaction flagging
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    # Verify case access
    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case and case_id not in ["case_101", "test_incomplete", "test_conflicting", "test_duplicate_blurry"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found or access denied."
        )

    report = verification_service.verify_case(case_id)
    return ApiResponse(
        success=True,
        message="Smart evidence verification analysis completed.",
        data=report
    )


@router.get("/cases/{case_id}/verification", response_model=ApiResponse[CaseVerificationReport])
def get_case_verification(
    case_id: str,
    authorization: Optional[str] = Header(None)
):
    """Retrieves current verification report for a case."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case and case_id not in ["case_101", "test_incomplete", "test_conflicting", "test_duplicate_blurry"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )

    report = verification_service.get_or_create_report(case_id)
    return ApiResponse(
        success=True,
        message="Verification report retrieved.",
        data=report
    )


@router.post("/cases/{case_id}/verification/confirm", response_model=ApiResponse[CaseVerificationReport])
def confirm_case_verification(
    case_id: str,
    payload: ConfirmVerificationPayload,
    authorization: Optional[str] = Header(None)
):
    """
    Citizen confirmation endpoint:
    Allows user to confirm verified findings, resolve discrepancies,
    fill missing fields, and seal the case as citizen-verified.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"
    user_name = user.full_name if user else "Demo Citizen"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case and case_id not in ["case_101", "test_incomplete", "test_conflicting", "test_duplicate_blurry"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )

    report = verification_service.confirm_case_verification(case_id, payload, user_name)
    return ApiResponse(
        success=True,
        message="Case evidence successfully verified and confirmed by citizen.",
        data=report
    )


@router.get("/test-scenarios/{scenario_type}", response_model=ApiResponse[CaseVerificationReport])
def get_test_verification_scenario(scenario_type: str):
    """
    Provides access to 4 pre-built testing scenarios:
    - 'complete': Full PhonePe receipt + SMS cross-verified case (Case 101)
    - 'incomplete': Missing UTR & beneficiary bank details
    - 'conflicting': Mismatched amounts (₹24,500 vs ₹35,000) & differing UTRs
    - 'blurry_duplicate': Blurry screenshot with unreadable OCR & duplicate upload
    """
    valid = ["complete", "incomplete", "conflicting", "blurry_duplicate"]
    if scenario_type not in valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scenario. Choose from {valid}."
        )

    report = verification_service.get_scenario(scenario_type)
    return ApiResponse(
        success=True,
        message=f"Pre-built '{scenario_type}' verification scenario loaded.",
        data=report
    )
