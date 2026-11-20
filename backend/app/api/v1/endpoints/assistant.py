from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
    AssistantLanguage
)
from app.services.assistant_service import assistant_service
from app.services.auth_service import auth_service
from app.services.dashboard_service import dashboard_service

router = APIRouter()


def extract_token(auth_header: Any = None) -> str:
    if isinstance(auth_header, str):
        return auth_header.replace("Bearer ", "").strip()
    return "demo_session_token"


@router.post("/chat", response_model=ApiResponse[ChatResponse])
def send_assistant_message(
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Main conversational endpoint for GoldenHour AI Emergency Assistant.
    Supports English, Telugu (తెలుగు), and Hindi (हिंदी).
    Features:
    - 1930 Helpline guidance
    - cybercrime.gov.in official portal instructions
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


@router.get("/topics", response_model=ApiResponse[Dict[str, List[Dict[str, str]]]])
def get_assistant_topics():
    """Returns quick inquiry prompt chips across English, Telugu, and Hindi."""
    topics = {
        "en": [
            {"id": "1930", "label": "How do I call the 1930 helpline?", "topic": "HELPLINE_1930"},
            {"id": "portal", "label": "How to file on cybercrime.gov.in?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "evidence", "label": "What evidence should I save?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "freeze", "label": "Difference between reporting & freezing account?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "senior", "label": "Senior citizen step-by-step guidance", "topic": "SENIOR_CITIZEN_GUIDANCE"},
            {"id": "rbi", "label": "What are the RBI Zero Liability rules?", "topic": "RBI_ZERO_LIABILITY"}
        ],
        "te": [
            {"id": "1930", "label": "1930 సైబర్ హెల్ప్‌లైన్‌కు ఎలా కాల్ చేయాలి?", "topic": "HELPLINE_1930"},
            {"id": "portal", "label": "సైబర్ పోర్టల్‌లో ఫిర్యాదు ఎలా చేయాలి?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "evidence", "label": "ఏ ఆధారాలు భద్రపరచాలి?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "freeze", "label": "ఫిర్యాదు మరియు ఖాతా ఫ్రీజ్ మధ్య తేడా ఏమిటి?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "senior", "label": "సీనియర్ సిటిజన్ సులభ రక్షణ మార్గదర్శి", "topic": "SENIOR_CITIZEN_GUIDANCE"},
            {"id": "rbi", "label": "RBI జీరో లయబిలిటీ నియమాలు ఏమిటి?", "topic": "RBI_ZERO_LIABILITY"}
        ],
        "hi": [
            {"id": "1930", "label": "1930 साइबर हेल्पलाइन पर कॉल कैसे करें?", "topic": "HELPLINE_1930"},
            {"id": "portal", "label": "cybercrime.gov.in पोर्टल पर शिकायत कैसे दर्ज करें?", "topic": "CYBERCRIME_PORTAL"},
            {"id": "evidence", "label": "धोखाधड़ी में कौन से सबूत सुरक्षित रखने चाहिए?", "topic": "EVIDENCE_PRESERVATION"},
            {"id": "freeze", "label": "रिपोर्टिंग और बैंक अकाउंट फ्रीज में क्या अंतर है?", "topic": "BANK_DISPUTE_VS_FREEZE"},
            {"id": "senior", "label": "वरिष्ठ नागरिकों के लिए आसान कदम", "topic": "SENIOR_CITIZEN_GUIDANCE"},
            {"id": "rbi", "label": "RBI के जीरो लायबिलिटी नियम क्या हैं?", "topic": "RBI_ZERO_LIABILITY"}
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
