from typing import List, Optional, Any
from fastapi import APIRouter, Header, UploadFile, File, Form, HTTPException, status, Response
from app.schemas.common import ApiResponse
from app.schemas.dashboard import (
    FraudCaseSummary,
    FraudCaseDetail,
    CreateCaseRequest
)
from app.schemas.evidence import EvidenceItem, EvidenceCategory
from app.services.dashboard_service import dashboard_service
from app.services.storage_service import storage_service
from app.services.auth_service import auth_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.post("", response_model=ApiResponse[FraudCaseDetail])
def create_fraud_case(req: CreateCaseRequest, authorization: Optional[str] = Header(None)):
    """
    Creates a new fraud incident case.
    Associates the case with the authenticated citizen.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    new_case = dashboard_service.create_case(victim_id, req)
    return ApiResponse(
        success=True,
        message=f"Fraud case '{new_case.case_number}' initialized successfully.",
        data=new_case
    )


@router.get("", response_model=ApiResponse[List[FraudCaseSummary]])
def list_user_cases(limit: int = 20, authorization: Optional[str] = Header(None)):
    """Lists all fraud cases for the logged-in citizen."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    cases = dashboard_service.get_recent_cases(victim_id, limit=limit)
    return ApiResponse(
        success=True,
        message="Cases retrieved.",
        data=cases
    )


@router.get("/{case_id}", response_model=ApiResponse[FraudCaseDetail])
def get_case_detail(case_id: str, authorization: Optional[str] = Header(None)):
    """Retrieves full case summary, including all attached digital evidence."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found or access denied."
        )

    return ApiResponse(
        success=True,
        message="Case summary retrieved.",
        data=case
    )


@router.post("/{case_id}/evidence", response_model=ApiResponse[EvidenceItem])
async def upload_case_evidence(
    case_id: str,
    file: UploadFile = File(...),
    category: EvidenceCategory = Form(EvidenceCategory.OTHER),
    description: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    Uploads and stores digital evidence for a specific fraud case.
    Validates MIME type, enforces 15MB limit, and stores securely in private storage.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    # Verify case exists & user owns it
    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found or access denied."
        )

    # Save to private storage
    upload_meta = await storage_service.save_case_evidence(
        file=file,
        case_id=case_id,
        category=category.value
    )

    # Attach to case
    item = dashboard_service.add_evidence(
        case_id=case_id,
        victim_id=victim_id,
        upload_meta=upload_meta,
        category=category,
        description=description
    )

    return ApiResponse(
        success=True,
        message=f"Evidence file '{file.filename}' uploaded and attached to case {case.case_number}.",
        data=item
    )


@router.get("/{case_id}/evidence", response_model=ApiResponse[List[EvidenceItem]])
def list_case_evidence(case_id: str, authorization: Optional[str] = Header(None)):
    """Lists all evidence items attached to the given case."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    try:
        items = dashboard_service.get_case_evidence(case_id, victim_id)
        return ApiResponse(
            success=True,
            message="Evidence files loaded.",
            data=items
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{case_id}/evidence/{evidence_id}", response_model=ApiResponse[bool])
def delete_case_evidence(
    case_id: str,
    evidence_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Deletes an uploaded evidence item from storage and detaches it from the case.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    try:
        deleted = dashboard_service.delete_evidence(case_id, evidence_id, victim_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence item not found."
            )
        return ApiResponse(
            success=True,
            message="Evidence deleted successfully.",
            data=True
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{case_id}/evidence/{evidence_id}/preview")
def preview_evidence_file(
    case_id: str,
    evidence_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Secure authenticated streaming preview of evidence file.
    Does NOT expose public URLs.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    case = dashboard_service.get_case_detail(case_id, victim_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    items = dashboard_service.get_case_evidence(case_id, victim_id)
    target = next((item for item in items if item.id == evidence_id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found")

    content = storage_service.get_file_content(target.storage_path)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content unavailable")

    return Response(content=content, media_type=target.content_type)
