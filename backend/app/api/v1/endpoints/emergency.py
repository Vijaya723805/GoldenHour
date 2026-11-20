from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.emergency import EmergencyGuidanceResponse, EmergencyActionStep, BankEmergencyContact

router = APIRouter()

BANK_CONTACTS = [
    BankEmergencyContact(
        bank_name="State Bank of India (SBI)",
        short_code="SBI",
        toll_free_number="1800111109 / 18001234",
        emergency_fraud_sms="SMS 'BLOCK' to 567676",
        email="customercare@sbi.co.in",
        portal_url="https://sbi.co.in/web/customer-care/cyber-security",
        freeze_account_sms_format="SMS 'LOCK <Account Number>' to 9223008333"
    ),
    BankEmergencyContact(
        bank_name="HDFC Bank",
        short_code="HDFC",
        toll_free_number="18002026161 / 18602676161",
        emergency_fraud_sms="Call helpline immediately",
        email="report.fraud@hdfcbank.com",
        portal_url="https://www.hdfcbank.com/personal/useful-links/security",
        freeze_account_sms_format="Dial 18002586161 and press 1 for fraud block"
    ),
    BankEmergencyContact(
        bank_name="ICICI Bank",
        short_code="ICICI",
        toll_free_number="18002662 / 18001080",
        emergency_fraud_sms="SMS 'BLOCK' to 5676766",
        email="antiphishing@icicibank.com",
        portal_url="https://www.icicibank.com/cyber-security",
        freeze_account_sms_format="SMS 'BLOCK <Account Number>' to 5676766"
    ),
    BankEmergencyContact(
        bank_name="Axis Bank",
        short_code="AXIS",
        toll_free_number="18604195555 / 18605005555",
        emergency_fraud_sms="SMS 'BLOCK' to 56161600",
        email="nodal.officer@axisbank.com",
        portal_url="https://www.axisbank.com/support/report-fraud",
        freeze_account_sms_format="SMS 'BLOCK' to 56161600"
    ),
    BankEmergencyContact(
        bank_name="Punjab National Bank (PNB)",
        short_code="PNB",
        toll_free_number="18001802222 / 18001032222",
        emergency_fraud_sms="SMS 'BLOCK' to 5607040",
        email="care@pnb.co.in",
        portal_url="https://www.pnbindia.in",
        freeze_account_sms_format="SMS 'HOTLIST' to 5607040"
    )
]

IMMEDIATE_STEPS = [
    EmergencyActionStep(
        step_number=1,
        title="Dial 1930 Cyber Helpline Immediately",
        urgency="CRITICAL",
        description="The Golden Hour window is the first 2-3 hours. National Cyber Crime Reporting Portal (1930) operates an integrated financial fraud mitigation network connecting RBI, banks, and payment gateways.",
        action_url_or_number="tel:1930",
        tips=[
            "Keep the 12-digit UTR/Reference number ready.",
            "Tell the operator the exact debit timestamp and recipient UPI VPA.",
            "Ask the operator for your NCRP Acknowledgement Token."
        ]
    ),
    EmergencyActionStep(
        step_number=2,
        title="Contact Your Bank Fraud Desk",
        urgency="CRITICAL",
        description="Notify your issuing bank to log an unauthorized debit dispute and request an immediate lien / stop-payment notification to the beneficiary bank.",
        action_url_or_number=None,
        tips=[
            "Invoke RBI Customer Protection Circular (zero liability for immediate reporting).",
            "Send the GoldenHour AI-generated Bank Nodal Letter via email to keep written proof."
        ]
    ),
    EmergencyActionStep(
        step_number=3,
        title="Register Complaint at cybercrime.gov.in",
        urgency="HIGH",
        description="Complete formal complaint submission on the National Cyber Crime Reporting Portal within 24 hours.",
        action_url_or_number="https://cybercrime.gov.in",
        tips=[
            "Use the GoldenHour formal cyber complaint text.",
            "Upload screenshot evidence as attachment."
        ]
    ),
    EmergencyActionStep(
        step_number=4,
        title="Disable UPI & Change Credentials",
        urgency="MEDIUM",
        description="Protect remaining funds in your account by temporarily disabling UPI or changing your banking login passwords from a clean device.",
        action_url_or_number=None,
        tips=[
            "If any remote desktop app (AnyDesk, TeamViewer) was installed, uninstall it immediately.",
            "GoldenHour will NEVER ask for your UPI PIN or banking passwords."
        ]
    )
]

@router.get("/instructions", response_model=ApiResponse[EmergencyGuidanceResponse])
def get_emergency_instructions():
    """Returns official Golden Hour guidance, steps, and bank contacts."""
    guidance = EmergencyGuidanceResponse(
        golden_hour_window_hours=2,
        toll_free_cyber_helpline="1930",
        national_portal_url="https://cybercrime.gov.in",
        immediate_steps=IMMEDIATE_STEPS,
        bank_contacts=BANK_CONTACTS,
        safety_advisory=(
            "GoldenHour is a rapid assistance and complaint generation tool. "
            "Never share your UPI PIN or OTP with anyone, including bank officials or police."
        )
    )
    return ApiResponse(success=True, message="Emergency instructions retrieved.", data=guidance)


@router.get("/bank-contacts")
def get_bank_contacts():
    """Returns emergency bank helpline directory."""
    return ApiResponse(success=True, message="Bank directory loaded.", data=BANK_CONTACTS)
