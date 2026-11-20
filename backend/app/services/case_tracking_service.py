import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

from app.schemas.case_tracking import (
    ActionStage,
    TrackingStatus,
    EmergencyChecklistItem,
    TimelineEvent,
    FollowUpNote,
    OfficialLinkItem,
    ReadyDocumentItem,
    FollowUpInfo,
    CaseTrackingDetail,
    EmergencyDashboardData
)
from app.services.dashboard_service import dashboard_service


DEFAULT_OFFICIAL_LINKS = [
    OfficialLinkItem(
        name="National Cybercrime Reporting Portal (NCRP)",
        url="https://cybercrime.gov.in/",
        category="GOVERNMENT_PORTAL",
        description="Official Government of India citizen portal (Ministry of Home Affairs) for lodging financial cyber fraud complaints.",
        verified=True,
        badge_text="Official GOV.IN Portal"
    ),
    OfficialLinkItem(
        name="Citizen Financial Cyber Fraud Helpline (1930)",
        url="tel:1930",
        category="NATIONAL_HELPLINE",
        description="Direct national toll-free helpline connecting victims with RBI, banks, and payment intermediaries in real-time.",
        verified=True,
        helpline_number="1930",
        badge_text="24x7 Toll-Free Helpline"
    ),
    OfficialLinkItem(
        name="State Bank of India (SBI) Cyber Fraud Desk",
        url="https://sbi.co.in/web/customer-care/cyber-security",
        category="BANK_PORTAL",
        description="Official SBI cyber security & unauthorized transaction dispute portal.",
        verified=True,
        helpline_number="1800111109 / 18001234",
        badge_text="SBI Nodal Helpdesk"
    ),
    OfficialLinkItem(
        name="HDFC Bank Cyber Security & Fraud Reporting",
        url="https://www.hdfcbank.com/personal/useful-links/security",
        category="BANK_PORTAL",
        description="HDFC 24x7 emergency card and netbanking dispute registration portal.",
        verified=True,
        helpline_number="18002026161",
        badge_text="HDFC Emergency Desk"
    ),
    OfficialLinkItem(
        name="ICICI Bank Anti-Phishing & Fraud Cell",
        url="https://www.icicibank.com/cyber-security",
        category="BANK_PORTAL",
        description="Official ICICI security portal for reporting fraudulent UPI transactions and unauthorized debits.",
        verified=True,
        helpline_number="18002662 / 18001080",
        badge_text="ICICI Fraud Cell"
    ),
    OfficialLinkItem(
        name="Axis Bank Fraud Dispute Center",
        url="https://www.axisbank.com/support/report-fraud",
        category="BANK_PORTAL",
        description="Axis Bank emergency dispute logging and debit freeze service.",
        verified=True,
        helpline_number="18604195555",
        badge_text="Axis Nodal Center"
    ),
    OfficialLinkItem(
        name="Punjab National Bank (PNB) Cyber Care",
        url="https://www.pnbindia.in",
        category="BANK_PORTAL",
        description="PNB customer care and emergency debit hotlisting desk.",
        verified=True,
        helpline_number="18001802222",
        badge_text="PNB Cyber Care"
    )
]


def create_default_checklist(case_id: str) -> List[EmergencyChecklistItem]:
    """Generates the official 3-stage emergency checklist with exactly prescribed stages."""
    return [
        # STAGE 1: WITHIN 10 MINUTES
        EmergencyChecklistItem(
            id="chk_10m_1930",
            stage=ActionStage.WITHIN_10_MINUTES,
            title="Contact the national cybercrime helpline at 1930.",
            description="Immediately call 1930 to initiate the Citizen Financial Cyber Fraud Reporting System (CFCFRS) alert across banking channels.",
            is_completed=False,
            action_url="tel:1930",
            action_label="Call 1930 Helpline",
            category="NATIONAL_HELPLINE"
        ),
        EmergencyChecklistItem(
            id="chk_10m_bank",
            stage=ActionStage.WITHIN_10_MINUTES,
            title="Inform the bank through its official channels.",
            description="Call your bank's toll-free fraud helpline or send emergency debit freeze SMS to request an immediate stop-payment or lien flag.",
            is_completed=False,
            action_url="/dashboard/emergency",
            action_label="View Bank Numbers",
            category="BANK_ALERT"
        ),
        EmergencyChecklistItem(
            id="chk_10m_evidence",
            stage=ActionStage.WITHIN_10_MINUTES,
            title="Preserve transaction receipts and communication evidence.",
            description="Take high-resolution screenshots of the debit notification, UPI app screen showing 12-digit UTR, SMS alerts, and chat logs.",
            is_completed=True,  # Initially true if case has evidence attached
            completed_at=datetime.now() - timedelta(minutes=30),
            action_url="/dashboard/report",
            action_label="Evidence Vault",
            category="EVIDENCE_PRESERVATION"
        ),
        EmergencyChecklistItem(
            id="chk_10m_instructions",
            stage=ActionStage.WITHIN_10_MINUTES,
            title="Follow official instructions.",
            description="Follow guidance from the 1930 operator or your bank branch nodal manager; never share UPI PIN, OTP, or passwords with anyone.",
            is_completed=False,
            action_url="/dashboard/assistant",
            action_label="AI Emergency Guide",
            category="COMPLIANCE"
        ),

        # STAGE 2: WITHIN 1 HOUR
        EmergencyChecklistItem(
            id="chk_1h_process",
            stage=ActionStage.WITHIN_1_HOUR,
            title="Complete the required financial cybercrime reporting process.",
            description="Furnish required transaction details (12-digit UTR, debit timestamp, sender account, scammer VPA) to complete initial triage.",
            is_completed=False,
            action_url=f"/dashboard/cases/{case_id}/verification",
            action_label="Verify UTR Parameters",
            category="FINANCIAL_REPORTING"
        ),
        EmergencyChecklistItem(
            id="chk_1h_portal",
            stage=ActionStage.WITHIN_1_HOUR,
            title="Submit a complaint through the official cybercrime portal where appropriate.",
            description="Access cybercrime.gov.in to formally log the cyber incident using your GoldenHour generated Cybercrime Dossier.",
            is_completed=False,
            action_url="https://cybercrime.gov.in/",
            action_label="Open cybercrime.gov.in",
            category="OFFICIAL_PORTAL"
        ),
        EmergencyChecklistItem(
            id="chk_1h_share_bank",
            stage=ActionStage.WITHIN_1_HOUR,
            title="Share evidence with the bank.",
            description="Email the generated formal Bank Dispute Letter & Freeze Requisition along with receipt screenshots to your bank fraud desk.",
            is_completed=False,
            action_url=f"/dashboard/cases/{case_id}/complaints",
            action_label="Download Bank Letter",
            category="BANK_COMMUNICATION"
        ),
        EmergencyChecklistItem(
            id="chk_1h_save_ref",
            stage=ActionStage.WITHIN_1_HOUR,
            title="Save acknowledgement and reference numbers.",
            description="Record your 1930 NCRP Acknowledgement Token and Bank Dispute Service Request (SR) number in the Case Tracker.",
            is_completed=False,
            action_url="#ref-numbers-card",
            action_label="Add Reference Numbers",
            category="RECORD_KEEPING"
        ),

        # STAGE 3: WITHIN 24 HOURS
        EmergencyChecklistItem(
            id="chk_24h_bank_followup",
            stage=ActionStage.WITHIN_24_HOURS,
            title="Follow up with the bank.",
            description="Contact your home branch or nodal officer with your dispute SR number to verify if an inter-bank lien requisition was served.",
            is_completed=False,
            action_url="/dashboard/emergency",
            action_label="Bank Contacts Directory",
            category="BANK_FOLLOWUP"
        ),
        EmergencyChecklistItem(
            id="chk_24h_ack_details",
            stage=ActionStage.WITHIN_24_HOURS,
            title="Keep complaint acknowledgement details.",
            description="Preserve digital and printed copies of all acknowledgement receipts, reference tokens, and email delivery timestamps.",
            is_completed=False,
            action_url=f"/dashboard/cases/{case_id}/complaints",
            action_label="Export All Documents",
            category="DOCUMENT_ARCHIVE"
        ),
        EmergencyChecklistItem(
            id="chk_24h_status_check",
            stage=ActionStage.WITHIN_24_HOURS,
            title="Check complaint status through official channels.",
            description="Visit cybercrime.gov.in -> 'Check Status' using your NCRP token. Never entertain third-party callers claiming fund recovery.",
            is_completed=False,
            action_url="https://cybercrime.gov.in/",
            action_label="Check Portal Status",
            category="STATUS_TRACKING"
        ),
        EmergencyChecklistItem(
            id="chk_24h_preserve_extra",
            stage=ActionStage.WITHIN_24_HOURS,
            title="Preserve all additional evidence.",
            description="Archive your updated bank account statement showing the debit entry, call recording files, and SMS audit trails.",
            is_completed=False,
            action_url="/dashboard/report",
            action_label="Upload Additional Vault Files",
            category="EVIDENCE_PRESERVATION"
        )
    ]


class CaseTrackingService:
    def __init__(self):
        self._tracking_store: Dict[str, CaseTrackingDetail] = {}
        self._seed_demo_tracking()

    def _seed_demo_tracking(self):
        """Pre-populates realistic tracking history for demo cases."""
        now = datetime.now()

        # Seed Tracking for Demo Case 101 (Active Golden Hour incident)
        chk_101 = create_default_checklist("case_101")
        chk_101[0].is_completed = True
        chk_101[0].completed_at = now - timedelta(minutes=35)
        chk_101[1].is_completed = True
        chk_101[1].completed_at = now - timedelta(minutes=25)
        chk_101[2].is_completed = True
        chk_101[2].completed_at = now - timedelta(minutes=40)

        timeline_101 = [
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Fraud Incident Reported by Citizen",
                description="Case GH-2024-8912 initialized. Amount: ₹24,500 lost via fake electricity bill payment link.",
                event_type="CASE_INITIALIZED",
                timestamp=now - timedelta(minutes=45),
                badge_variant="crimson"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Evidence Uploaded to Private Vault",
                description="2 files uploaded: 'phonepe_payment_receipt_24500.png' and 'electricity_threat_sms.png'.",
                event_type="EVIDENCE_UPLOADED",
                timestamp=now - timedelta(minutes=40),
                badge_variant="gold"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="AI OCR & Entity Extraction Complete (Module 3)",
                description="Claude Vision & PaddleOCR extracted 12-digit UTR 412890563412 with 98% confidence. Scammer VPA: rewards.claim77@ybl.",
                event_type="AI_EXTRACTION",
                timestamp=now - timedelta(minutes=37),
                badge_variant="default"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Citizen Verification Sealed (Module 4)",
                description="Complainant inspected parameters, confirmed transaction details, and sealed verification status.",
                event_type="USER_VERIFIED",
                timestamp=now - timedelta(minutes=35),
                badge_variant="emerald"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Emergency Helpline 1930 Contacted",
                description="Citizen completed initial telephone call to National Cyber Helpline (1930). Operator logged incident.",
                event_type="HELPLINE_CONTACTED",
                timestamp=now - timedelta(minutes=30),
                badge_variant="emerald"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Bank Fraud Hotspot Alert Dispatched",
                description="Informed issuing bank via official fraud emergency line. Stop-payment flag requested.",
                event_type="BANK_DISPUTE_SUBMITTED",
                timestamp=now - timedelta(minutes=25),
                badge_variant="default"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="4 Legal Complaint Documents Generated (Module 6)",
                description="Formal Bank Letter, Freeze Requisition, 1930 Script, and Cybercrime Dossier compiled in English.",
                event_type="COMPLAINTS_GENERATED",
                timestamp=now - timedelta(minutes=20),
                badge_variant="gold"
            )
        ]

        notes_101 = [
            FollowUpNote(
                id=str(uuid.uuid4()),
                note_text="Called 1930 operator at 12:15 PM. They assigned an initial intake token and advised uploading transaction receipt on cybercrime.gov.in.",
                author="Citizen Complainant",
                category="1930 Helpline Call",
                created_at=now - timedelta(minutes=28)
            ),
            FollowUpNote(
                id=str(uuid.uuid4()),
                note_text="Called SBI Customer Care. Executive gave Service Request SR-88192031 and advised submitting written dispute letter at branch.",
                author="Citizen Complainant",
                category="Bank Support Call",
                created_at=now - timedelta(minutes=22)
            )
        ]

        self._tracking_store["case_101"] = CaseTrackingDetail(
            case_id="case_101",
            case_number="GH-2024-8912",
            victim_id="user_demo_772",
            title="Unauthorized PhonePe Transfer via Fake Electricity Bill Link",
            amount_lost=24500.0,
            transaction_id_utr="412890563412",
            beneficiary_upi_id="rewards.claim77@ybl",
            beneficiary_bank="YES BANK",
            current_status=TrackingStatus.REPORTED_TO_1930,
            created_at=now - timedelta(minutes=45),
            updated_at=now - timedelta(minutes=10),
            golden_hour_active=True,
            ncrp_acknowledgement_token="2024/NCRP/819203",
            ncrp_submission_confirmed=True,
            bank_dispute_sr_number="SBI-SR-88192031",
            bank_submission_confirmed=True,
            police_station_ref=None,
            submission_confirmed_at=now - timedelta(minutes=20),
            checklist_items=chk_101,
            timeline=timeline_101,
            follow_up_notes=notes_101,
            ready_documents=self._build_ready_docs("case_101", "GH-2024-8912"),
            follow_up_info=self._build_follow_up_info("State Bank of India (SBI)"),
            important_next_actions=[
                "Submit formal cyber complaint at https://cybercrime.gov.in/ using your generated Dossier.",
                "Email generated Bank Freeze / Lien Requisition to customercare@sbi.co.in with UTR 412890563412.",
                "Save your NCRP acknowledgement receipt PDF and keep reference number handy for bank branch visit."
            ]
        )

        # Seed Tracking for Demo Case 102
        chk_102 = create_default_checklist("case_102")
        for i in range(6):
            chk_102[i].is_completed = True
            chk_102[i].completed_at = now - timedelta(days=1, hours=i)

        timeline_102 = [
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Case Initialized: OLX Advance Shipping Fee Scam",
                description="Case GH-2024-7621 registered for ₹15,000 lost via fake QR code.",
                event_type="CASE_INITIALIZED",
                timestamp=now - timedelta(days=2),
                badge_variant="crimson"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Evidence Uploaded",
                description="Screenshot of WhatsApp QR code discussion uploaded.",
                event_type="EVIDENCE_UPLOADED",
                timestamp=now - timedelta(days=2),
                badge_variant="gold"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Official 1930 Token Recorded",
                description="Citizen confirmed 1930 registration with token NCRP-2024-991823.",
                event_type="REFERENCE_LOGGED",
                timestamp=now - timedelta(days=1, hours=18),
                badge_variant="emerald"
            ),
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Lien Inquiry Active with Beneficiary Bank",
                description="Bank nodal officer acknowledged dispute SR-AXIS-449102. Lien status inquiry forwarded to Axis Bank.",
                event_type="STATUS_UPDATED",
                timestamp=now - timedelta(days=1, hours=6),
                badge_variant="gold"
            )
        ]

        self._tracking_store["case_102"] = CaseTrackingDetail(
            case_id="case_102",
            case_number="GH-2024-7621",
            victim_id="user_demo_772",
            title="OLX Advance Shipping Fee Scam via Fake QR Code",
            amount_lost=15000.0,
            transaction_id_utr="412988129034",
            beneficiary_upi_id="merchantpay.secure@okaxis",
            beneficiary_bank="Axis Bank",
            current_status=TrackingStatus.LIEN_INQUIRY_ACTIVE,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
            golden_hour_active=False,
            ncrp_acknowledgement_token="2024/NCRP/991823",
            ncrp_submission_confirmed=True,
            bank_dispute_sr_number="AXIS-SR-449102",
            bank_submission_confirmed=True,
            police_station_ref=None,
            submission_confirmed_at=now - timedelta(days=1, hours=18),
            checklist_items=chk_102,
            timeline=timeline_102,
            follow_up_notes=[
                FollowUpNote(
                    id=str(uuid.uuid4()),
                    note_text="Branch visit completed. Handed over physical printout of Freeze Request to Chief Manager. Manager confirmed lien inquiry logged.",
                    author="Citizen Complainant",
                    category="Branch Visit",
                    created_at=now - timedelta(days=1, hours=10)
                )
            ],
            ready_documents=self._build_ready_docs("case_102", "GH-2024-7621"),
            follow_up_info=self._build_follow_up_info("Axis Bank"),
            important_next_actions=[
                "Check NCRP portal for status updates from cybercrime cell.",
                "Follow up with Axis Bank Nodal Officer regarding lien inquiry response."
            ]
        )

    def _build_ready_docs(self, case_id: str, case_number: str) -> List[ReadyDocumentItem]:
        """Constructs ready download links for the 4 core complaint documents."""
        return [
            ReadyDocumentItem(
                doc_type="BANK_FRAUD_COMPLAINT",
                title="Bank Fraud Dispute Letter",
                description="Formal dispute letter invoking RBI Circular on Zero Liability for prompt reporting of unauthorized electronic debits.",
                pdf_url=f"/api/v1/complaints/cases/{case_id}/BANK_FRAUD_COMPLAINT/pdf",
                view_url=f"/dashboard/cases/{case_id}/complaints",
                is_ready=True,
                recommended_stage="WITHIN_10_MINUTES"
            ),
            ReadyDocumentItem(
                doc_type="BANK_FREEZE_REQUEST",
                title="Urgent Account Freeze / Lien Requisition",
                description="Legal notice to issuing bank to transmit debit-hold lien notification to scammer beneficiary bank under PMLA & RBI guidelines.",
                pdf_url=f"/api/v1/complaints/cases/{case_id}/BANK_FREEZE_REQUEST/pdf",
                view_url=f"/dashboard/cases/{case_id}/complaints",
                is_ready=True,
                recommended_stage="WITHIN_1_HOUR"
            ),
            ReadyDocumentItem(
                doc_type="HELPLINE_1930_SCRIPT",
                title="1930 Cybercrime Helpline Speaking Script",
                description="Structured verbal prompt containing exact debit timestamp, 12-digit UTR, and fraudster UPI handle for rapid 1930 intake.",
                pdf_url=f"/api/v1/complaints/cases/{case_id}/HELPLINE_1930_SCRIPT/pdf",
                view_url=f"/dashboard/cases/{case_id}/complaints",
                is_ready=True,
                recommended_stage="WITHIN_10_MINUTES"
            ),
            ReadyDocumentItem(
                doc_type="CYBERCRIME_PORTAL_DRAFT",
                title="Cybercrime Portal (cybercrime.gov.in) Complaint Dossier",
                description="Comprehensive complaint dossier formatted specifically for copy-paste entry into the Ministry of Home Affairs NCRP portal.",
                pdf_url=f"/api/v1/complaints/cases/{case_id}/CYBERCRIME_PORTAL_DRAFT/pdf",
                view_url=f"/dashboard/cases/{case_id}/complaints",
                is_ready=True,
                recommended_stage="WITHIN_1_HOUR"
            )
        ]

    def _build_follow_up_info(self, bank_name: str = "State Bank of India") -> FollowUpInfo:
        return FollowUpInfo(
            primary_bank_name=bank_name,
            primary_bank_helpline="1800111109 / 18001234",
            bank_fraud_email="customercare@sbi.co.in",
            cybercrime_helpline="1930",
            cybercrime_portal_url="https://cybercrime.gov.in/",
            next_follow_up_target="Within 24 Hours of reporting",
            recommended_action="Email freeze requisition to nodal desk and monitor 1930 portal ticket status.",
            bank_nodal_advisory=(
                "Under RBI circular DBR.No.Leg.BC.78/09.07.005/2017-18, immediate notification within 3 working days "
                "limits customer liability for unauthorized third-party electronic transactions. Always obtain and preserve "
                "a formal dispute acknowledgment token."
            )
        )

    def _get_or_create_tracking(self, case_id: str, victim_id: str) -> CaseTrackingDetail:
        """Retrieves tracking detail or initializes a fresh record for any case."""
        if case_id in self._tracking_store:
            return self._tracking_store[case_id]

        # Retrieve underlying case details
        case = dashboard_service.get_case_detail(case_id, victim_id)
        case_number = case.case_number if case else f"GH-2024-{case_id[:4]}"
        title = case.title if case else "UPI Fraud Incident"
        amount = case.amount_lost if case else 0.0
        utr = case.transaction_id_utr if case else None
        vpa = case.beneficiary_upi_id if case else None
        bank = case.beneficiary_bank if case else "Primary Bank"
        created_at = case.created_at if case else datetime.now()
        golden_hour = case.golden_hour_active if case else False

        chk = create_default_checklist(case_id)
        now = datetime.now()

        timeline = [
            TimelineEvent(
                id=str(uuid.uuid4()),
                title="Case Initialized in GoldenHour",
                description=f"Incident registered. Tracking started for case {case_number}.",
                event_type="CASE_INITIALIZED",
                timestamp=created_at,
                badge_variant="crimson"
            )
        ]

        if case and case.evidence_items:
            chk[2].is_completed = True
            chk[2].completed_at = now
            timeline.append(TimelineEvent(
                id=str(uuid.uuid4()),
                title="Evidence Preserved in Private Vault",
                description=f"{len(case.evidence_items)} file(s) attached to case.",
                event_type="EVIDENCE_UPLOADED",
                timestamp=now - timedelta(minutes=15),
                badge_variant="gold"
            ))

        new_tracking = CaseTrackingDetail(
            case_id=case_id,
            case_number=case_number,
            victim_id=victim_id,
            title=title,
            amount_lost=amount,
            transaction_id_utr=utr,
            beneficiary_upi_id=vpa,
            beneficiary_bank=bank,
            current_status=TrackingStatus.CASE_INITIALIZED,
            created_at=created_at,
            updated_at=now,
            golden_hour_active=golden_hour,
            checklist_items=chk,
            timeline=timeline,
            follow_up_notes=[],
            ready_documents=self._build_ready_docs(case_id, case_number),
            follow_up_info=self._build_follow_up_info(bank or "Issuing Bank"),
            important_next_actions=[
                "Dial 1930 Cybercrime Helpline immediately.",
                "Inform bank to log an unauthorized debit dispute.",
                "Download and email the AI-generated Freeze Requisition to your bank."
            ]
        )

        self._tracking_store[case_id] = new_tracking
        return new_tracking

    def get_case_tracking(self, case_id: str, victim_id: str) -> CaseTrackingDetail:
        tracking = self._get_or_create_tracking(case_id, victim_id)
        # Refresh documents and computed next actions
        tracking.ready_documents = self._build_ready_docs(case_id, tracking.case_number)
        tracking.important_next_actions = self._compute_next_actions(tracking)
        return tracking

    def _compute_next_actions(self, tracking: CaseTrackingDetail) -> List[str]:
        """Computes prioritized next actions based on checklist state."""
        actions: List[str] = []
        pending = [item for item in tracking.checklist_items if not item.is_completed]
        
        if any(item.id == "chk_10m_1930" for item in pending):
            actions.append("URGENT: Dial 1930 Cyber Helpline now to alert the National Cybercrime Network.")
        if any(item.id == "chk_10m_bank" for item in pending):
            actions.append("Call your issuing bank's emergency hotline to place an immediate stop-payment flag.")
        if any(item.id == "chk_1h_portal" for item in pending):
            actions.append("Submit formal complaint on https://cybercrime.gov.in/ using your generated Dossier.")
        if any(item.id == "chk_1h_share_bank" for item in pending):
            actions.append("Email the generated Freeze Requisition Letter to your bank nodal fraud desk.")
        if any(item.id == "chk_1h_save_ref" for item in pending) and not tracking.ncrp_acknowledgement_token:
            actions.append("Manually record your 1930 NCRP Acknowledgement Token in the Reference Numbers card.")
        if any(item.id == "chk_24h_bank_followup" for item in pending):
            actions.append("Follow up with bank branch manager with your dispute Service Request (SR) number.")

        if not actions:
            actions.append("All critical emergency checklist items completed. Monitor official portal status daily.")

        return actions[:4]

    def update_reference_numbers(
        self,
        case_id: str,
        victim_id: str,
        ncrp_token: Optional[str] = None,
        bank_sr_number: Optional[str] = None,
        police_ref: Optional[str] = None,
        confirm_ncrp_submitted: Optional[bool] = None,
        confirm_bank_submitted: Optional[bool] = None
    ) -> CaseTrackingDetail:
        tracking = self.get_case_tracking(case_id, victim_id)
        now = datetime.now()

        updated_items = []
        if ncrp_token is not None and ncrp_token.strip():
            tracking.ncrp_acknowledgement_token = ncrp_token.strip()
            updated_items.append(f"1930/NCRP Token: {ncrp_token.strip()}")
            # Mark checklist item 8 completed
            for it in tracking.checklist_items:
                if it.id == "chk_1h_save_ref":
                    it.is_completed = True
                    it.completed_at = now

        if bank_sr_number is not None and bank_sr_number.strip():
            tracking.bank_dispute_sr_number = bank_sr_number.strip()
            updated_items.append(f"Bank Dispute SR: {bank_sr_number.strip()}")

        if police_ref is not None and police_ref.strip():
            tracking.police_station_ref = police_ref.strip()
            updated_items.append(f"Police/FIR Ref: {police_ref.strip()}")

        if confirm_ncrp_submitted is not None:
            tracking.ncrp_submission_confirmed = confirm_ncrp_submitted
            if confirm_ncrp_submitted:
                for it in tracking.checklist_items:
                    if it.id == "chk_1h_portal":
                        it.is_completed = True
                        it.completed_at = now
                if tracking.current_status == TrackingStatus.CASE_INITIALIZED:
                    tracking.current_status = TrackingStatus.PORTAL_COMPLAINT_FILED

        if confirm_bank_submitted is not None:
            tracking.bank_submission_confirmed = confirm_bank_submitted
            if confirm_bank_submitted:
                for it in tracking.checklist_items:
                    if it.id == "chk_1h_share_bank":
                        it.is_completed = True
                        it.completed_at = now
                if tracking.current_status in [TrackingStatus.CASE_INITIALIZED, TrackingStatus.REPORTED_TO_1930]:
                    tracking.current_status = TrackingStatus.BANK_DISPUTE_SUBMITTED

        if updated_items:
            tracking.submission_confirmed_at = now
            tracking.timeline.insert(
                0,
                TimelineEvent(
                    id=str(uuid.uuid4()),
                    title="Official Reference Numbers Updated by Citizen",
                    description=f"Citizen logged verified reference details: {', '.join(updated_items)}.",
                    event_type="REFERENCE_LOGGED",
                    timestamp=now,
                    badge_variant="emerald"
                )
            )

        tracking.updated_at = now
        tracking.important_next_actions = self._compute_next_actions(tracking)
        return tracking

    def update_tracking_status(
        self,
        case_id: str,
        victim_id: str,
        new_status: TrackingStatus,
        note: Optional[str] = None
    ) -> CaseTrackingDetail:
        tracking = self.get_case_tracking(case_id, victim_id)
        now = datetime.now()

        old_status = tracking.current_status
        tracking.current_status = new_status
        tracking.updated_at = now

        status_text = new_status.value.replace("_", " ").title()
        desc = f"Follow-up status transitioned from {old_status.value} to {new_status.value}."
        if note:
            desc += f" Note: {note}"

        tracking.timeline.insert(
            0,
            TimelineEvent(
                id=str(uuid.uuid4()),
                title=f"Status Updated: {status_text}",
                description=desc,
                event_type="STATUS_UPDATED",
                timestamp=now,
                badge_variant="gold"
            )
        )

        if note:
            tracking.follow_up_notes.insert(
                0,
                FollowUpNote(
                    id=str(uuid.uuid4()),
                    note_text=note,
                    author="Citizen Complainant",
                    category="Status Update Note",
                    created_at=now
                )
            )

        tracking.important_next_actions = self._compute_next_actions(tracking)
        return tracking

    def add_follow_up_note(
        self,
        case_id: str,
        victim_id: str,
        note_text: str,
        category: str = "General Follow-up"
    ) -> CaseTrackingDetail:
        tracking = self.get_case_tracking(case_id, victim_id)
        now = datetime.now()

        new_note = FollowUpNote(
            id=str(uuid.uuid4()),
            note_text=note_text.strip(),
            author="Citizen Complainant",
            category=category,
            created_at=now
        )
        tracking.follow_up_notes.insert(0, new_note)
        tracking.updated_at = now

        tracking.timeline.insert(
            0,
            TimelineEvent(
                id=str(uuid.uuid4()),
                title=f"Note Added: {category}",
                description=note_text.strip()[:180] + ("..." if len(note_text) > 180 else ""),
                event_type="NOTE_ADDED",
                timestamp=now,
                badge_variant="default"
            )
        )

        return tracking

    def toggle_checklist_item(
        self,
        case_id: str,
        victim_id: str,
        item_id: str,
        is_completed: bool
    ) -> CaseTrackingDetail:
        tracking = self.get_case_tracking(case_id, victim_id)
        now = datetime.now()

        target_item = None
        for item in tracking.checklist_items:
            if item.id == item_id:
                target_item = item
                item.is_completed = is_completed
                item.completed_at = now if is_completed else None
                break

        if not target_item:
            raise ValueError(f"Checklist item '{item_id}' not found.")

        tracking.updated_at = now
        action_verb = "Completed" if is_completed else "Marked Incomplete"
        stage_label = target_item.stage.value.replace("_", " ").title()

        tracking.timeline.insert(
            0,
            TimelineEvent(
                id=str(uuid.uuid4()),
                title=f"Checklist Action: {action_verb}",
                description=f"[{stage_label}] {target_item.title}",
                event_type="CHECKLIST_COMPLETED" if is_completed else "CHECKLIST_RESET",
                timestamp=now,
                badge_variant="emerald" if is_completed else "default"
            )
        )

        tracking.important_next_actions = self._compute_next_actions(tracking)
        return tracking

    def get_emergency_dashboard(self, case_id: str, victim_id: str) -> EmergencyDashboardData:
        tracking = self.get_case_tracking(case_id, victim_id)
        
        pending_items = [it for it in tracking.checklist_items if not it.is_completed]
        completed_count = len(tracking.checklist_items) - len(pending_items)
        total_count = len(tracking.checklist_items)
        percentage = int((completed_count / total_count * 100)) if total_count > 0 else 0

        ref_dict = {
            "ncrp_acknowledgement_token": tracking.ncrp_acknowledgement_token,
            "bank_dispute_sr_number": tracking.bank_dispute_sr_number,
            "police_station_ref": tracking.police_station_ref,
            "ncrp_confirmed": "Yes" if tracking.ncrp_submission_confirmed else "Pending User Confirmation",
            "bank_confirmed": "Yes" if tracking.bank_submission_confirmed else "Pending User Confirmation"
        }

        return EmergencyDashboardData(
            case_id=tracking.case_id,
            case_number=tracking.case_number,
            current_status=tracking.current_status,
            case_created_at=tracking.created_at,
            golden_hour_active=tracking.golden_hour_active,
            amount_lost=tracking.amount_lost,
            transaction_id_utr=tracking.transaction_id_utr,
            beneficiary_upi_id=tracking.beneficiary_upi_id,
            important_next_actions=tracking.important_next_actions,
            pending_checklist_items=pending_items,
            completed_checklist_count=completed_count,
            total_checklist_count=total_count,
            completion_percentage=percentage,
            ready_documents=tracking.ready_documents,
            follow_up_info=tracking.follow_up_info or self._build_follow_up_info(),
            reference_numbers=ref_dict,
            official_links=DEFAULT_OFFICIAL_LINKS,
            disclaimer=tracking.disclaimer
        )


case_tracking_service = CaseTrackingService()
