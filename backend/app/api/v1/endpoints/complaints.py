import io
from typing import Optional, Any
from fastapi import APIRouter, Header, HTTPException, status, Response, Query
from fastapi.responses import StreamingResponse

from app.schemas.common import ApiResponse
from app.schemas.complaint import (
    ComplaintDocType,
    DocumentLanguage,
    GeneratedDocument,
    CaseComplaintBundle,
    UpdateComplaintDraftPayload,
    GenerateComplaintsRequest
)
from app.services.complaint_service import complaint_service
from app.services.pdf_service import pdf_service
from app.services.auth_service import auth_service
from app.services.dashboard_service import dashboard_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.post("/cases/{case_id}/generate", response_model=ApiResponse[CaseComplaintBundle])
def generate_case_complaints(
    case_id: str,
    req: GenerateComplaintsRequest = GenerateComplaintsRequest(),
    authorization: Optional[str] = Header(None)
):
    """
    Generates all 4 structured complaint documents using verified fraud case parameters:
    1. Bank Fraud Complaint Letter
    2. Bank Account Freeze / Lien Requisition Draft
    3. 1930 National Cybercrime Helpline Speaking Script
    4. Cybercrime Portal (cybercrime.gov.in) Complaint Dossier
    Supports English, Telugu (తెలుగు), and Hindi (हिंदी).
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)
    victim_id = user.id if user else "user_demo_772"

    bundle = complaint_service.get_or_generate_bundle(
        case_id=case_id,
        language=req.language,
        force_regenerate=req.regenerate
    )

    return ApiResponse(
        success=True,
        message=f"4 complaint documents generated in {req.language.value.upper()}.",
        data=bundle
    )


@router.get("/cases/{case_id}", response_model=ApiResponse[CaseComplaintBundle])
def get_case_complaints(
    case_id: str,
    language: DocumentLanguage = Query(DocumentLanguage.EN),
    authorization: Optional[str] = Header(None)
):
    """Retrieves generated complaint documents bundle for a case."""
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)

    bundle = complaint_service.get_or_generate_bundle(case_id=case_id, language=language)
    return ApiResponse(
        success=True,
        message="Complaint documents bundle retrieved.",
        data=bundle
    )


@router.put("/cases/{case_id}/{doc_type}", response_model=ApiResponse[GeneratedDocument])
def update_complaint_document(
    case_id: str,
    doc_type: ComplaintDocType,
    payload: UpdateComplaintDraftPayload,
    language: DocumentLanguage = Query(DocumentLanguage.EN),
    authorization: Optional[str] = Header(None)
):
    """
    Allows the citizen to edit and customize a complaint draft before downloading.
    Preserves user edits in memory.
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)

    try:
        updated_doc = complaint_service.update_document(
            case_id=case_id,
            doc_type=doc_type,
            payload=payload,
            language=language
        )
        return ApiResponse(
            success=True,
            message="Complaint draft successfully updated.",
            data=updated_doc
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/cases/{case_id}/{doc_type}/pdf")
def download_complaint_pdf(
    case_id: str,
    doc_type: ComplaintDocType,
    language: DocumentLanguage = Query(DocumentLanguage.EN),
    authorization: Optional[str] = Header(None)
):
    """
    Renders and streams a professional, downloadable PDF of the requested complaint document.
    Includes case metadata table, missing information callout, document timestamp,
    and mandatory legal notice.
    """
    bundle = complaint_service.get_or_generate_bundle(case_id=case_id, language=language)
    
    doc_key = doc_type.value
    if doc_key not in bundle.documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document type '{doc_key}' not found."
        )

    doc = bundle.documents[doc_key]

    pdf_bytes = pdf_service.generate_complaint_pdf(
        case_number=bundle.case_number,
        doc_type=doc_type,
        title=doc.title,
        content=doc.content,
        structured_fields=doc.structured_fields,
        missing_fields=doc.missing_fields,
        action_items=doc.action_items,
        language=language
    )

    filename = f"{bundle.case_number}_{doc_type.value.lower()}_{language.value}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Length": str(len(pdf_bytes))
        }
    )
