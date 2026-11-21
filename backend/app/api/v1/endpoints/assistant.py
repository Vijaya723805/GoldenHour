from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
    AssistantLanguage,
    TranslateHistoryRequest,
    TranslateHistoryResponse
)
from app.services.assistant_service import assistant_service
from app.services.auth_service import auth_service
from app.services.dashboard_service import dashboard_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return ""


@router.post("/chat", response_model=ApiResponse[ChatResponse])
def send_assistant_message(
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Main conversational endpoint for GoldenHour AI Emergency Assistant.
    Supports English, Telugu (తెలుగు), and Hindi (हिंदी).
    Features:
    - Context-aware intent parsing (greetings, fraud triage, follow-up resolutions)
    - 1930 Helpline guidance & cybercrime.gov.in official SOPs
    - Evidence preservation checklist
    - Bank dispute vs. account freeze distinctions
    - Senior citizen step-by-step guidance
    - Context-aware answers based on verified case parameters (with permission)
    - Zero-credential sanitization & PIN/OTP redaction
    """
    token = extract_token(authorization)
    user = auth_service.get_current_user(token)

    resp = assistant_service.process_chat(req)
    return ApiResponse(
        success=True,
        message="Assistant response generated.",
        data=resp
    )


@router.post("/translate-history", response_model=ApiResponse[TranslateHistoryResponse])
def translate_assistant_history(req: TranslateHistoryRequest):
    """
    Translates an entire visible conversation history into English, Telugu, or Hindi
    while strictly preserving transaction IDs, UPI VPAs, phone numbers, amounts, and timestamps.
    """
    translated = assistant_service.translate_history(req.messages, req.target_language)
    return ApiResponse(
        success=True,
        message="Conversation history translated.",
        data=TranslateHistoryResponse(
            translated_messages=translated,
            target_language=req.target_language
        )
    )


@router.get("/topics", response_model=ApiResponse[Dict[str, List[Dict[str, str]]]])
def get_assistant_topics():
    """Returns dynamic inquiry prompt chips matching user requirements across English, Telugu, and Hindi."""
    topics = {
        "en": [
            {"id": "call_1930", "label": "How do I call 1930?", "topic": "HELPLINE_1930"},
            {"id": "report_upi", "label": "How do I report UPI fraud?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "save_evidence", "label": "What evidence should I save?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "contact_bank", "label": "How do I contact my bank?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "money_recovery", "label": "Can my money be recovered?", "topic": "RBI_ZERO_LIABILITY"},
            {"id": "fake_qr", "label": "What should I do after a fake QR scam?", "topic": "FAKE_QR_SCAM"}
        ],
        "te": [
            {"id": "call_1930", "label": "1930 నంబర్కు ఎలా కాల్ చేయాలి?", "topic": "HELPLINE_1930"},
            {"id": "report_upi", "label": "UPI మోసాన్ని ఎలా ఫిర్యాదు చేయాలి?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "save_evidence", "label": "నేను ఏ ఆధారాలను భద్రపరచాలి?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "contact_bank", "label": "నా బ్యాంకును ఎలా సంప్రదించాలి?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "money_recovery", "label": "నా డబ్బు తిరిగి వస్తుందా?", "topic": "RBI_ZERO_LIABILITY"},
            {"id": "fake_qr", "label": "నకిలీ QR కోడ్ మోసం తర్వాత ఏమి చేయాలి?", "topic": "FAKE_QR_SCAM"}
        ],
        "hi": [
            {"id": "call_1930", "label": "1930 पर कैसे कॉल करें?", "topic": "HELPLINE_1930"},
            {"id": "report_upi", "label": "UPI धोखाधड़ी की शिकायत कैसे करें?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "save_evidence", "label": "कौन से सबूत सुरक्षित रखने चाहिए?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "contact_bank", "label": "बैंक से कैसे संपर्क करें?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "money_recovery", "label": "क्या मेरा पैसा वापस मिल सकता है?", "topic": "RBI_ZERO_LIABILITY"},
            {"id": "fake_qr", "label": "फर्जी QR कोड धोखाधड़ी के बाद क्या करें?", "topic": "FAKE_QR_SCAM"}
        ]
    }
    return ApiResponse(
        success=True,
        message="Assistant topics loaded.",
        data=topics
    )


@router.get("/context-preview/{case_id}", response_model=ApiResponse[Dict[str, Any]])
def get_assistant_context_preview(case_id: str):
    """Returns the verified case details that would be shared with the AI assistant."""
    ctx = assistant_service.get_case_context(case_id)
    if not ctx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' context not found."
        )
    return ApiResponse(
        success=True,
        message="Context preview retrieved.",
        data=ctx
    )
