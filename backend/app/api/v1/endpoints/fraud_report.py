import uuid
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.schemas.common import ApiResponse
from app.schemas.fraud_report import (
    FraudReportDraftRequest, 
    FraudReportResponse, 
    ReportStatus, 
    ComplaintDocument, 
    TransactionSummary
)
from app.services.claude_service import claude_service
from app.services.validation_service import validation_service

router = APIRouter()

# In-memory registry for report drafts in development
report_registry: Dict[str, FraudReportResponse] = {}

@router.post("/draft", response_model=ApiResponse[FraudReportResponse])
def create_complaint_draft(request: FraudReportDraftRequest):
    """
    Creates an AI-assisted complaint draft.
    Does NOT submit to authorities. All drafts require victim review and approval.
    """
    # Sanitize incident description
    sanitized_desc, _ = validation_service.inspect_and_sanitize_text(request.incident_description)

    victim_info = {
        "victim_name": request.victim_name,
        "victim_phone": request.victim_phone,
        "victim_email": request.victim_email,
        "victim_bank_name": request.victim_bank_name,
        "incident_description": sanitized_desc
    }

    tx_info = request.transaction.model_dump() if request.transaction else {
        "transaction_id_utr": "PENDING_VERIFICATION",
        "amount": 0.0,
        "beneficiary_upi_id": "UNKNOWN",
        "app_used": "UPI"
    }

    # Generate documents with Claude Service
    drafts_dict = claude_service.generate_complaint_draft(victim_info, tx_info)

    complaint_documents = [
        ComplaintDocument(
            format_type="CYBER_CRIME_PORTAL_1930",
            title="Formal Complaint Draft for National Cyber Crime Reporting Portal (cybercrime.gov.in)",
            body_text=drafts_dict["cyber_crime_portal_draft"],
            action_items_for_victim=[
                "Dial 1930 immediately to log transaction acknowledgment with the National Helpline.",
                "Copy this formal text into the Incident Details section on cybercrime.gov.in.",
                "Attach the uploaded screenshot evidence to the portal."
            ]
        ),
        ComplaintDocument(
            format_type="BANK_NODAL_OFFICER",
            title="Urgent Bank Dispute & Lien Request Letter",
            body_text=drafts_dict["bank_nodal_letter_draft"],
            action_items_for_victim=[
                "Email this letter to your bank's Principal Nodal Officer.",
                "Request immediate communication with the beneficiary bank for a debit freeze.",
                "Keep the bank acknowledgment ticket number safely."
            ]
        )
    ]

    report_id = str(uuid.uuid4())
    report_response = FraudReportResponse(
        report_id=report_id,
        status=ReportStatus.REVIEW_PENDING,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        victim_name=request.victim_name,
        victim_phone=request.victim_phone,
        category=request.category,
        transaction=request.transaction,
        complaint_drafts=complaint_documents,
        user_approved=False,
        approval_timestamp=None
    )

    report_registry[report_id] = report_response

    return ApiResponse(
        success=True,
        message="Complaint draft generated successfully. Ready for user review.",
        data=report_response
    )


@router.post("/{report_id}/approve", response_model=ApiResponse[FraudReportResponse])
def approve_complaint_draft(report_id: str):
    """
    Victim marks the complaint draft as reviewed and approved.
    Enforces compliance with the rule that GoldenHour never auto-submits.
    """
    report = report_registry.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Complaint report not found")

    report.user_approved = True
    report.approval_timestamp = datetime.now()
    report.status = ReportStatus.APPROVED_BY_USER
    report.updated_at = datetime.now()

    return ApiResponse(
        success=True,
        message="Report approved by user. You can now download or submit this document to authorities.",
        data=report
    )


@router.get("/sample", response_model=ApiResponse[FraudReportResponse])
def get_sample_report():
    """Returns a realistic sample complaint report for hackathon presentation."""
    tx = TransactionSummary(
        transaction_id_utr="412890563412",
        amount=24500.0,
        timestamp=datetime.now(),
        sender_upi_id="victim.user@okaxis",
        beneficiary_upi_id="rewards.claim77@ybl",
        beneficiary_account="XXXXXX9821",
        beneficiary_bank="YES BANK",
        app_used="PhonePe"
    )
    req = FraudReportDraftRequest(
        victim_name="Rahul Sharma",
        victim_phone="+919876543210",
        victim_email="rahul.sharma@example.com",
        victim_bank_name="Axis Bank",
        incident_description="Received a message claiming cash cashback reward. Clicking the link triggered an unauthorized debit request without consent.",
        category="LOTTERY_REWARD_SCAM",
        evidence_ids=["sample-id"],
        transaction=tx
    )
    return create_complaint_draft(req)
