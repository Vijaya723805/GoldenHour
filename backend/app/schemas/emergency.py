from typing import List, Optional
from pydantic import BaseModel, Field


class BankEmergencyContact(BaseModel):
    bank_name: str
    short_code: str
    toll_free_number: str
    emergency_fraud_sms: Optional[str] = None
    email: Optional[str] = None
    portal_url: Optional[str] = None
    freeze_account_sms_format: Optional[str] = None


class EmergencyActionStep(BaseModel):
    step_number: int
    title: str
    urgency: str = Field("CRITICAL", description="CRITICAL, HIGH, MEDIUM")
    description: str
    action_url_or_number: Optional[str] = None
    tips: List[str] = Field(default_factory=list)


class EmergencyGuidanceResponse(BaseModel):
    golden_hour_window_hours: int = Field(2, description="The first 2-3 hours are vital for lien creation")
    toll_free_cyber_helpline: str = "1930"
    national_portal_url: str = "https://cybercrime.gov.in"
    immediate_steps: List[EmergencyActionStep]
    bank_contacts: List[BankEmergencyContact]
    safety_advisory: str
