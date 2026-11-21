from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any, List
from app.schemas.common import ApiResponse
from app.schemas.evidence import (
    EvidenceUploadResponse, 
    EvidenceAnalysisResponse, 
    ExtractedTransactionData,
    IntakeAnalysisResult,
    IntakeScreenshotItem
)
from app.services.storage_service import storage_service
from app.services.claude_service import claude_service
from app.services.ocr_service import ocr_service
from app.services.validation_service import validation_service

router = APIRouter()

# In-memory registry for development session uploads
uploaded_evidence_registry: Dict[str, Dict[str, Any]] = {}

@router.post("/upload", response_model=ApiResponse[EvidenceUploadResponse])
async def upload_evidence(file: UploadFile = File(...)):
    """
    Secure evidence upload endpoint.
    Validates file extension, limits file size, and stores safely.
    """
    upload_result = await storage_service.save_upload(file)
    evidence_id = upload_result["evidence_id"]
    
    # Store metadata for session retrieval
    uploaded_evidence_registry[evidence_id] = upload_result

    data = EvidenceUploadResponse(
        evidence_id=evidence_id,
        case_id=upload_result.get("case_id", "intake"),
        filename=upload_result["original_filename"],
        file_size=upload_result["file_size"],
        content_type=upload_result["content_type"] or "application/octet-stream",
        category=upload_result.get("category", "UPI_RECEIPT"),
        storage_location=upload_result["cloud_status"],
        upload_timestamp=str(upload_result.get("timestamp", ""))
    )
    return ApiResponse(success=True, message="Evidence file uploaded securely.", data=data)


@router.post("/analyze/{evidence_id}", response_model=ApiResponse[EvidenceAnalysisResponse])
def analyze_evidence(evidence_id: str):
    """
    Extracts transaction parameters from uploaded evidence using Claude Vision & OCR.
    Enforces security redaction of any sensitive credentials (PINs/OTPs).
    """
    metadata = uploaded_evidence_registry.get(evidence_id)
    file_path = metadata["local_path"] if metadata else ""

    # Run AI Analysis
    analysis = claude_service.analyze_evidence(file_path=file_path)
    ocr_result = ocr_service.extract_text(file_path=file_path)

    # Sanitize and validate raw text
    sanitized_text, redacted = validation_service.inspect_and_sanitize_text(
        f"{analysis['raw_text_summary']} | {ocr_result['text']}"
    )

    tx_dict = analysis["transaction"]
    transaction = ExtractedTransactionData(
        transaction_id_utr=tx_dict.get("transaction_id_utr"),
        amount=tx_dict.get("amount"),
        timestamp=tx_dict.get("timestamp"),
        sender_upi_id=tx_dict.get("sender_upi_id"),
        beneficiary_upi_id=tx_dict.get("beneficiary_upi_id"),
        beneficiary_account=tx_dict.get("beneficiary_account"),
        beneficiary_bank=tx_dict.get("beneficiary_bank"),
        app_used=tx_dict.get("app_used"),
        confidence_score=analysis.get("confidence_score", 0.9)
    )

    response_data = EvidenceAnalysisResponse(
        evidence_id=evidence_id,
        transaction=transaction,
        detected_category=analysis.get("detected_category", "UNAUTHORIZED_DEBIT"),
        raw_text_summary=sanitized_text,
        redacted_sensitive_data=redacted or analysis.get("redacted_sensitive_data", True),
        security_flags=analysis.get("security_flags", [])
    )

    return ApiResponse(
        success=True, 
        message="Evidence analyzed successfully with security redaction.", 
        data=response_data
    )


@router.get("/sample", response_model=ApiResponse[EvidenceAnalysisResponse])
def get_sample_evidence_analysis():
    """Returns sample extracted fraud transaction evidence for offline hackathon testing."""
    sample_analysis = claude_service._generate_mock_analysis()
    tx_dict = sample_analysis["transaction"]
    
    transaction = ExtractedTransactionData(
        transaction_id_utr=tx_dict.get("transaction_id_utr"),
        amount=tx_dict.get("amount"),
        timestamp=tx_dict.get("timestamp"),
        sender_upi_id=tx_dict.get("sender_upi_id"),
        beneficiary_upi_id=tx_dict.get("beneficiary_upi_id"),
        beneficiary_account=tx_dict.get("beneficiary_account"),
        beneficiary_bank=tx_dict.get("beneficiary_bank"),
        app_used=tx_dict.get("app_used"),
        confidence_score=0.96
    )

    response_data = EvidenceAnalysisResponse(
        evidence_id="sample-demo-evidence-id",
        transaction=transaction,
        detected_category="LOTTERY_REWARD_SCAM",
        raw_text_summary="Payment of Rs 24,500 successful to rewards.claim77@ybl. Ref: 412890563412",
        redacted_sensitive_data=True,
        security_flags=[]
    )
    return ApiResponse(success=True, message="Sample evidence loaded.", data=response_data)


@router.post("/analyze-intake", response_model=ApiResponse[IntakeAnalysisResult])
async def analyze_intake_evidence(files: List[UploadFile] = File(...)):
    """
    Intake Analysis Endpoint:
    Processes multiple fraud evidence screenshots (UPI receipts, bank statements, SMS alerts, WhatsApp chats).
    Automatically extracts:
    - Incident title / headline
    - Scam category
    - Detailed fraud incident narrative
    - Transaction date and time
    - 12-digit UTR
    - Beneficiary UPI ID / VPA
    - Fraudster phone number
    - Suggested amount
    - Flags missing fields without fabricating data.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one evidence screenshot must be provided.")

    saved_items = []
    for f in files:
        upload_result = await storage_service.save_upload(f)
        evidence_id = upload_result["evidence_id"]
        uploaded_evidence_registry[evidence_id] = upload_result
        saved_items.append(upload_result)

    intake_result_dict = claude_service.analyze_intake_screenshots(saved_items)

    result = IntakeAnalysisResult(
        incident_title=intake_result_dict["incident_title"],
        scam_category=intake_result_dict["scam_category"],
        incident_description=intake_result_dict["incident_description"],
        transaction_date_time=intake_result_dict.get("transaction_date_time"),
        transaction_id_utr=intake_result_dict.get("transaction_id_utr"),
        beneficiary_upi_id=intake_result_dict.get("beneficiary_upi_id"),
        fraudster_phone=intake_result_dict.get("fraudster_phone"),
        suggested_amount=intake_result_dict.get("suggested_amount"),
        app_used=intake_result_dict.get("app_used"),
        beneficiary_bank=intake_result_dict.get("beneficiary_bank"),
        sender_upi_id=intake_result_dict.get("sender_upi_id"),
        beneficiary_name=intake_result_dict.get("beneficiary_name"),
        fields=intake_result_dict.get("fields", {}),
        conflict_warnings=intake_result_dict.get("conflict_warnings", []),
        quality_warnings=intake_result_dict.get("quality_warnings", []),
        missing_fields=intake_result_dict.get("missing_fields", []),
        debug_diagnostics=intake_result_dict.get("debug_diagnostics"),
        uploaded_evidence=[
            IntakeScreenshotItem(**it) for it in intake_result_dict.get("uploaded_evidence", [])
        ]
    )

    return ApiResponse(
        success=True,
        message="Intake evidence screenshots analyzed and incident details extracted.",
        data=result
    )

