import uuid
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.schemas.dashboard import (
    FraudCaseSummary,
    FraudCaseDetail,
    DashboardStats,
    CaseStatus,
    CreateCaseRequest
)
from app.schemas.evidence import EvidenceItem, EvidenceCategory
from app.services.storage_service import storage_service

CASES_STORE_FILE = Path(__file__).resolve().parent.parent.parent / "uploads" / "cases_store.json"


class DashboardService:
    def __init__(self):
        self._cases: Dict[str, FraudCaseDetail] = {}
        self._evidence: Dict[str, List[EvidenceItem]] = {}
        self._seed_demo_cases()
        self._load_from_disk()

    def _save_to_disk(self):
        try:
            CASES_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
            cases_dict = {}
            for cid, c in self._cases.items():
                cd = c.dict() if hasattr(c, "dict") else c.model_dump()
                cases_dict[cid] = cd
            
            evidence_dict = {}
            for cid, ev_list in self._evidence.items():
                evidence_dict[cid] = [
                    (e.dict() if hasattr(e, "dict") else e.model_dump())
                    for e in ev_list
                ]

            payload = {
                "cases": cases_dict,
                "evidence": evidence_dict
            }
            with open(CASES_STORE_FILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, default=str, indent=2)
        except Exception as e:
            print(f"[DashboardService] Could not persist cases: {e}")

    def _load_from_disk(self):
        try:
            if CASES_STORE_FILE.exists():
                with open(CASES_STORE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                raw_cases = data.get("cases", {})
                for cid, cdata in raw_cases.items():
                    if isinstance(cdata.get("created_at"), str):
                        cdata["created_at"] = datetime.fromisoformat(cdata["created_at"])
                    if isinstance(cdata.get("updated_at"), str):
                        cdata["updated_at"] = datetime.fromisoformat(cdata["updated_at"])
                    # Rebuild evidence items inside case
                    ev_items = []
                    for e in cdata.get("evidence_items", []):
                        if isinstance(e.get("created_at"), str):
                            e["created_at"] = datetime.fromisoformat(e["created_at"])
                        ev_items.append(EvidenceItem(**e))
                    cdata["evidence_items"] = ev_items
                    self._cases[cid] = FraudCaseDetail(**cdata)

                raw_ev = data.get("evidence", {})
                for cid, ev_list in raw_ev.items():
                    loaded_items = []
                    for e in ev_list:
                        if isinstance(e.get("created_at"), str):
                            e["created_at"] = datetime.fromisoformat(e["created_at"])
                        loaded_items.append(EvidenceItem(**e))
                    self._evidence[cid] = loaded_items
        except Exception as e:
            print(f"[DashboardService] Could not load persisted cases: {e}")


    def _seed_demo_cases(self):
        """Seeds realistic fictional fraud cases and digital evidence for hackathon testing."""
        now = datetime.now()

        # Demo Case 101
        case_101 = FraudCaseDetail(
            id="case_101",
            case_number="GH-2024-8912",
            victim_id="user_demo_772",
            title="Unauthorized PhonePe Transfer via Fake Electricity Bill Link",
            fraud_category="PHISHING_PAYMENT_LINK",
            fraud_description="Received an urgent SMS claiming my home electricity power would be disconnected at 9:30 PM tonight unless bill was cleared. Clicked the APK link which opened a payment gateway screen asking for a verification transfer of Rs 24,500.",
            incident_date=(now - timedelta(minutes=45)).isoformat(),
            transaction_id_utr="412890563412",
            amount_lost=24500.0,
            beneficiary_upi_id="rewards.claim77@ybl",
            beneficiary_bank="YES BANK",
            status=CaseStatus.REVIEW_PENDING,
            created_at=now - timedelta(minutes=45),
            updated_at=now - timedelta(minutes=10),
            golden_hour_active=True,
            evidence_count=2,
            preferred_language="en",
            contact_phone="+919876543210",
            contact_email="victim.demo@goldenhour.in",
            evidence_items=[]
        )

        ev_1 = EvidenceItem(
            id="ev_101_1",
            case_id="case_101",
            file_name="phonepe_payment_receipt_24500.png",
            sanitized_file_name="ev_101_phonepe_receipt.png",
            file_size_bytes=425120,
            content_type="image/png",
            category=EvidenceCategory.UPI_RECEIPT,
            description="Screenshot showing successful transfer of Rs. 24,500 to rewards.claim77@ybl with UTR 412890563412",
            storage_location="private_vault",
            storage_path="uploads/case_101/ev_101_phonepe_receipt.png",
            created_at=now - timedelta(minutes=40),
            has_preview=True
        )

        ev_2 = EvidenceItem(
            id="ev_101_2",
            case_id="case_101",
            file_name="electricity_threat_sms.png",
            sanitized_file_name="ev_102_sms_threat.png",
            file_size_bytes=312480,
            content_type="image/png",
            category=EvidenceCategory.SMS_ALERT,
            description="Phishing SMS from sender claiming to be State Electricity Board",
            storage_location="private_vault",
            storage_path="uploads/case_101/ev_102_sms_threat.png",
            created_at=now - timedelta(minutes=38),
            has_preview=True
        )

        case_101.evidence_items = [ev_1, ev_2]
        self._cases["case_101"] = case_101
        self._evidence["case_101"] = [ev_1, ev_2]

        # Demo Case 102
        case_102 = FraudCaseDetail(
            id="case_102",
            case_number="GH-2024-7621",
            victim_id="user_demo_772",
            title="OLX Advance Shipping Fee Scam via Fake QR Code",
            fraud_category="FAKE_QR_SCAM",
            fraud_description="Buyer on OLX agreed to buy furniture and sent a QR code stating 'Scan to receive payment'. Scanning the code debited Rs 15,000 from my account instead.",
            incident_date=(now - timedelta(days=2)).isoformat(),
            transaction_id_utr="412988129034",
            amount_lost=15000.0,
            beneficiary_upi_id="merchantpay.secure@okaxis",
            beneficiary_bank="Axis Bank",
            status=CaseStatus.LIEN_REQUESTED,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
            golden_hour_active=False,
            evidence_count=1,
            preferred_language="en",
            contact_phone="+919876543210",
            contact_email="victim.demo@goldenhour.in",
            evidence_items=[]
        )

        ev_3 = EvidenceItem(
            id="ev_102_1",
            case_id="case_102",
            file_name="fake_qr_code_whatsapp.jpg",
            sanitized_file_name="ev_103_olx_qr.jpg",
            file_size_bytes=289400,
            content_type="image/jpeg",
            category=EvidenceCategory.WHATSAPP_CHAT,
            description="WhatsApp chat where fraudster sent 'Scan to Receive Money' QR image",
            storage_location="private_vault",
            storage_path="uploads/case_102/ev_103_olx_qr.jpg",
            created_at=now - timedelta(days=2),
            has_preview=True
        )
        case_102.evidence_items = [ev_3]
        self._cases["case_102"] = case_102
        self._evidence["case_102"] = [ev_3]

        # Demo Case 103
        case_103 = FraudCaseDetail(
            id="case_103",
            case_number="GH-2024-6410",
            victim_id="user_demo_772",
            title="Bank Official Impersonation & APK Remote Access",
            fraud_category="BANK_OR_OFFICIAL_IMPERSONATION",
            fraud_description="Caller posed as bank credit card department offering reward points. Guided me to install AnyDesk support tool.",
            incident_date=(now - timedelta(days=5)).isoformat(),
            transaction_id_utr="411092837411",
            amount_lost=48000.0,
            beneficiary_upi_id="fastclearance@icici",
            beneficiary_bank="ICICI Bank",
            status=CaseStatus.SUBMITTED_TO_CYBER_CELL,
            created_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=4),
            golden_hour_active=False,
            evidence_count=1,
            preferred_language="en",
            evidence_items=[]
        )
        self._cases["case_103"] = case_103
        self._evidence["case_103"] = []

        # Demo Case 104
        case_104 = FraudCaseDetail(
            id="case_104",
            case_number="GH-2024-5109",
            victim_id="user_demo_772",
            title="Lottery Scratch Card Reward Scam on WhatsApp",
            fraud_category="LOTTERY_REWARD_SCAM",
            fraud_description="Received scratch card image winning 25,000. Asked for 9,500 advance processing tax.",
            incident_date=(now - timedelta(days=12)).isoformat(),
            transaction_id_utr="410293847291",
            amount_lost=9500.0,
            beneficiary_upi_id="giftclaim99@paytm",
            beneficiary_bank="Paytm Payments Bank",
            status=CaseStatus.RECOVERED,
            created_at=now - timedelta(days=12),
            updated_at=now - timedelta(days=9),
            golden_hour_active=False,
            evidence_count=1,
            preferred_language="en",
            evidence_items=[]
        )
        self._cases["case_104"] = case_104
        self._evidence["case_104"] = []

    def get_user_stats(self, victim_id: str) -> DashboardStats:
        user_cases = [c for c in self._cases.values() if c.victim_id == victim_id]
        total_cases = len(user_cases)
        cases_in_prep = len([c for c in user_cases if c.status in [CaseStatus.DRAFT, CaseStatus.IN_PREPARATION, CaseStatus.REVIEW_PENDING]])
        submitted = len([c for c in user_cases if c.status in [CaseStatus.APPROVED, CaseStatus.LIEN_REQUESTED, CaseStatus.SUBMITTED_TO_CYBER_CELL, CaseStatus.RECOVERED, CaseStatus.CLOSED]])
        amount_lost = sum(c.amount_lost for c in user_cases)
        amount_recovered = sum(c.amount_lost for c in user_cases if c.status == CaseStatus.RECOVERED)
        active_golden = len([c for c in user_cases if c.golden_hour_active])

        return DashboardStats(
            total_cases=total_cases,
            cases_in_preparation=cases_in_prep,
            submitted_complaints=submitted,
            total_amount_defrauded=amount_lost,
            total_amount_recovered=amount_recovered,
            active_golden_hour_cases=active_golden
        )

    def get_recent_cases(self, victim_id: str, limit: int = 15) -> List[FraudCaseSummary]:
        user_cases = [c for c in self._cases.values() if c.victim_id == victim_id]
        user_cases.sort(key=lambda c: c.created_at, reverse=True)
        return user_cases[:limit]

    def get_case_detail(self, case_id: str, victim_id: str) -> Optional[FraudCaseDetail]:
        case = self._cases.get(case_id)
        if not case:
            return None
        # Verify ownership (or allow demo)
        if case.victim_id != victim_id and victim_id != "user_demo_772":
            return None
        # Sync latest evidence items
        case.evidence_items = self._evidence.get(case_id, [])
        case.evidence_count = len(case.evidence_items)
        return case

    def create_case(self, victim_id: str, req: CreateCaseRequest) -> FraudCaseDetail:
        case_id = f"case_{uuid.uuid4().hex[:8]}"
        case_number = f"GH-{datetime.now().year}-{str(uuid.uuid4().int)[:4]}"
        now = datetime.now()

        attached_evidence: List[EvidenceItem] = []
        if req.evidence_ids:
            for evid in req.evidence_ids:
                meta = storage_service.get_evidence_meta(evid)
                if meta:
                    cat = meta.get("category") or EvidenceCategory.UPI_RECEIPT
                    if isinstance(cat, str):
                        try:
                            cat = EvidenceCategory(cat)
                        except Exception:
                            cat = EvidenceCategory.OTHER
                    ev_item = EvidenceItem(
                        id=evid,
                        case_id=case_id,
                        file_name=meta.get("original_filename", "evidence.png"),
                        sanitized_file_name=meta.get("sanitized_filename", f"{evid}.png"),
                        file_size_bytes=meta.get("file_size", 0),
                        content_type=meta.get("content_type", "image/png"),
                        category=cat,
                        description=f"Evidence for case {case_number}",
                        storage_location=meta.get("storage_location", "private_vault"),
                        storage_path=meta.get("local_path", meta.get("storage_path", "")),
                        created_at=now,
                        has_preview=True
                    )
                    attached_evidence.append(ev_item)

        new_case = FraudCaseDetail(
            id=case_id,
            case_number=case_number,
            victim_id=victim_id,
            title=req.title,
            fraud_category=req.fraud_category,
            fraud_description=req.fraud_description,
            incident_date=req.incident_date or now.isoformat(),
            transaction_id_utr=req.transaction_id_utr,
            amount_lost=req.amount_lost,
            beneficiary_upi_id=req.beneficiary_upi_id,
            beneficiary_bank=req.beneficiary_bank,
            preferred_language=req.preferred_language,
            contact_phone=req.contact_phone,
            contact_email=req.contact_email,
            fraudster_phone=req.fraudster_phone,
            status=CaseStatus.REVIEW_PENDING,
            created_at=now,
            updated_at=now,
            golden_hour_active=True,
            evidence_count=len(attached_evidence),
            evidence_items=attached_evidence
        )

        self._cases[case_id] = new_case
        self._evidence[case_id] = attached_evidence
        self._save_to_disk()
        return new_case

    def add_evidence(
        self,
        case_id: str,
        victim_id: str,
        upload_meta: Dict[str, Any],
        category: EvidenceCategory,
        description: Optional[str] = None
    ) -> EvidenceItem:
        case = self.get_case_detail(case_id, victim_id)
        if not case:
            raise ValueError(f"Fraud case '{case_id}' not found or access denied.")

        ev_id = upload_meta.get("evidence_id", str(uuid.uuid4()))
        item = EvidenceItem(
            id=ev_id,
            case_id=case_id,
            file_name=upload_meta.get("original_filename", "evidence.png"),
            sanitized_file_name=upload_meta.get("sanitized_filename", f"{ev_id}.png"),
            file_size_bytes=upload_meta.get("file_size", 0),
            content_type=upload_meta.get("content_type", "image/png"),
            category=category,
            description=description,
            storage_location=upload_meta.get("storage_location", "private_vault"),
            storage_path=upload_meta.get("local_path", upload_meta.get("storage_path", "")),
            created_at=datetime.now(),
            has_preview=True
        )

        if case_id not in self._evidence:
            self._evidence[case_id] = []

        self._evidence[case_id].append(item)
        case.evidence_items = self._evidence[case_id]
        case.evidence_count = len(case.evidence_items)
        case.updated_at = datetime.now()
        self._save_to_disk()

        return item

    def get_case_evidence(self, case_id: str, victim_id: str) -> List[EvidenceItem]:
        case = self.get_case_detail(case_id, victim_id)
        if not case:
            raise ValueError(f"Fraud case '{case_id}' not found or access denied.")
        return self._evidence.get(case_id, [])

    def delete_evidence(self, case_id: str, evidence_id: str, victim_id: str) -> bool:
        case = self.get_case_detail(case_id, victim_id)
        if not case:
            raise ValueError(f"Fraud case '{case_id}' not found or access denied.")

        evidence_list = self._evidence.get(case_id, [])
        target_item = None
        for ev in evidence_list:
            if ev.id == evidence_id:
                target_item = ev
                break

        if not target_item:
            return False

        # Delete physical file from storage
        storage_service.delete_evidence_file(
            local_path=target_item.storage_path,
            storage_path=target_item.storage_path
        )

        # Remove from in-memory list
        self._evidence[case_id] = [ev for ev in evidence_list if ev.id != evidence_id]
        case.evidence_items = self._evidence[case_id]
        case.evidence_count = len(case.evidence_items)
        case.updated_at = datetime.now()
        self._save_to_disk()
        return True


dashboard_service = DashboardService()
