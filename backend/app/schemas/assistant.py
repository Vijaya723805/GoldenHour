from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class AssistantLanguage(str, Enum):
    EN = "en"  # English
    TE = "te"  # Telugu (తెలుగు)
    HI = "hi"  # Hindi (हिंदी)


class AssistantTopic(str, Enum):
    GREETING = "GREETING"
    HELPLINE_1930 = "HELPLINE_1930"
    CYBERCRIME_PORTAL = "CYBERCRIME_PORTAL"
    EVIDENCE_PRESERVATION = "EVIDENCE_PRESERVATION"
    BANK_DISPUTE_VS_FREEZE = "BANK_DISPUTE_VS_FREEZE"
    SENIOR_CITIZEN_GUIDANCE = "SENIOR_CITIZEN_GUIDANCE"
    RBI_ZERO_LIABILITY = "RBI_ZERO_LIABILITY"
    FAKE_QR_SCAM = "FAKE_QR_SCAM"
    PHISHING_LINK = "PHISHING_LINK"
    REMOTE_ACCESS = "REMOTE_ACCESS"
    UNAUTHORIZED_DEBIT = "UNAUTHORIZED_DEBIT"
    SIM_FRAUD = "SIM_FRAUD"
    WHATSAPP_IMPERSONATION = "WHATSAPP_IMPERSONATION"
    CASE_SPECIFIC_INQUIRY = "CASE_SPECIFIC_INQUIRY"
    UNRELATED_INQUIRY = "UNRELATED_INQUIRY"
    LEGAL_LIMITATION = "LEGAL_LIMITATION"
    GENERAL = "GENERAL"


class ChatMessageItem(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: AssistantLanguage = AssistantLanguage.EN
    case_id: Optional[str] = None
    use_case_context: bool = False
    senior_citizen_mode: bool = False
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


class QuickAction(BaseModel):
    label: str
    action_type: str  # "CALL", "NAVIGATE", "PROMPT"
    action_target: str
    description: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    language: AssistantLanguage
    detected_topic: AssistantTopic = AssistantTopic.GENERAL
    suggested_quick_actions: List[QuickAction] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    senior_citizen_mode: bool = False
    zero_credential_sanitized: bool = True
    context_used: Optional[Dict[str, Any]] = None
    disclaimer: str = (
        "IMPORTANT: GoldenHour AI provides educational guidance based on official 1930 and RBI procedures. "
        "It cannot freeze accounts, guarantee fund recovery, or auto-file police complaints. "
        "Never share your UPI PIN or OTP with anyone."
    )


class TranslateHistoryRequest(BaseModel):
    messages: List[Dict[str, Any]]
    target_language: AssistantLanguage


class TranslateHistoryResponse(BaseModel):
    translated_messages: List[Dict[str, Any]]
    target_language: AssistantLanguage
