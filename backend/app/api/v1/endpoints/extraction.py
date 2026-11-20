from typing import List, Optional, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.extraction import (
    EvidenceExtractionResult,
    UserVerificationRequest
)
from app.services.extraction_service import extraction_service
from app.services.dashboard_service import dashboard_service
from app.services.auth_service import auth_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.post("/cases/{case_id}/evidence/{evidence_id}/extract", response_model=ApiResponse[EvidenceExtractionResult])
def run_evidence_extraction(
    case_id: str,
    evidence_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Executes AI-powered evidence extraction (Claude Vision + PaddleOCR + Pydantic validation)
    on the specified evidence item.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found or access denied."
        )

    evidence_items = dashboard_service.get_case_evidence(case_id, victim_id)
    target = next((e for e in evidence_items if e.id == evidence_id), None)

    file_path = target.storage_path if target else ""
    file_name = target.file_name if target else "evidence_screenshot.png"
    category = target.category.value if target else "UPI_RECEIPT"

    extraction = extraction_service.extract_evidence(
        case_id=case_id,
        evidence_id=evidence_id,
        file_path=file_path,
        file_name=file_name,
        category=category
    )

    return ApiResponse(
        success=True,
        message="AI evidence extraction completed successfully.",
        data=extraction
    )


@router.get("/cases/{case_id}/evidence/{evidence_id}/extraction", response_model=ApiResponse[EvidenceExtractionResult])
def get_evidence_extraction(
    case_id: str,
    evidence_id: str,
    authorization: Optional[str] = Header(None)
):
    """Retrieves saved extraction results for an evidence file."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    res = extraction_service.get_extraction(evidence_id)
    if not res:
        # If not extracted yet, trigger on the fly
        evidence_items = dashboard_service.get_case_evidence(case_id, victim_id)
        target = next((e for e in evidence_items if e.id == evidence_id), None)
        if target:
            res = extraction_service.extract_evidence(
                case_id=case_id,
                evidence_id=evidence_id,
                file_path=target.storage_path,
                file_name=target.file_name,
                category=target.category.value
            )
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found")

    return ApiResponse(
        success=True,
        message="Extraction result retrieved.",
        data=res
    )


@router.get("/cases/{case_id}/extractions", response_model=ApiResponse[List[EvidenceExtractionResult]])
def get_case_extractions(
    case_id: str,
    authorization: Optional[str] = Header(None)
):
    """Retrieves all extraction results for evidence items attached to this case."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    items = extraction_service.get_case_extractions(case_id)
    return ApiResponse(
        success=True,
        message="Case extractions retrieved.",
        data=items
    )


@router.post("/cases/{case_id}/evidence/{evidence_id}/verify", response_model=ApiResponse[EvidenceExtractionResult])
def verify_extraction_data(
    case_id: str,
    evidence_id: str,
    req: UserVerificationRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Complainant human-in-the-loop review and correction endpoint.
    Allows victim to confirm extracted parameters and supply inline corrections.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    try:
        updated = extraction_service.verify_and_correct_extraction(evidence_id, req)
        return ApiResponse(
            success=True,
            message="Complainant verification and corrections saved.",
            data=updated
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/sample", response_model=ApiResponse[EvidenceExtractionResult])
def get_sample_extraction():
    """Returns sample pre-analyzed PhonePe receipt extraction for testing and presentation."""
    res = extraction_service.get_extraction("ev_101_1")
    return ApiResponse(
        success=True,
        message="Sample extraction loaded.",
        data=res
    )
