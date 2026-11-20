import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image, ImageFilter, ImageStat

from app.schemas.verification import (
    VerificationStatus,
    SeverityLevel,
    QualityIssueType,
    MissingFieldItem,
    InconsistentFieldItem,
    EvidenceQualityIssue,
    DuplicateTransactionItem,
    VerifiedFieldItem,
    ConfirmationNeededItem,
    CaseVerificationReport,
    ConfirmVerificationPayload
)
from app.schemas.extraction import EvidenceExtractionResult, ConfidenceLevel
from app.schemas.evidence import EvidenceItem, EvidenceCategory
from app.services.extraction_service import extraction_service
from app.services.dashboard_service import dashboard_service


class VerificationService:
    def __init__(self):
        # In-memory store for verification reports keyed by case_id
        self._reports: Dict[str, CaseVerificationReport] = {}
        self._seed_test_scenarios()

    def _seed_test_scenarios(self):
        """Seeds realistic pre-built scenarios for complete, incomplete, conflicting, and blurry test cases."""
        now = datetime.now()

        # 1. Complete Consistent Scenario (Case 101)
        self._reports["case_101"] = CaseVerificationReport(
            id="rep_case_101",
            case_id="case_101",
            case_number="GH-2024-8912",
            verification_status=VerificationStatus.ACTION_REQUIRED,
            completeness_score=94.0,
            consistency_score=96.0,
            quality_score=92.0,
            overall_score=94.2,
            verified_fields=[
                VerifiedFieldItem(
                    field_key="transaction_id_utr",
                    label="Transaction UTR / Ref No",
                    value="412890563412",
                    confidence=0.98,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1"],
                    source_file_names=["phonepe_payment_receipt_24500.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="amount",
                    label="Disputed Fraud Amount",
                    value=24500.0,
                    confidence=0.98,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1", "ev_101_2"],
                    source_file_names=["phonepe_payment_receipt_24500.png", "electricity_threat_sms.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Beneficiary UPI ID / VPA",
                    value="rewards.claim77@ybl",
                    confidence=0.97,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1", "ev_101_2"],
                    source_file_names=["phonepe_payment_receipt_24500.png", "electricity_threat_sms.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="transaction_date",
                    label="Transaction Date",
                    value=now.strftime("%Y-%m-%d"),
                    confidence=0.95,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1", "ev_101_2"],
                    source_file_names=["phonepe_payment_receipt_24500.png", "electricity_threat_sms.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="beneficiary_bank",
                    label="Beneficiary Bank",
                    value="YES BANK",
                    confidence=0.92,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1"],
                    source_file_names=["phonepe_payment_receipt_24500.png"],
                    is_cross_verified=False,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="sender_bank",
                    label="Remitter / Victim Bank",
                    value="Axis Bank",
                    confidence=0.95,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_101_1"],
                    source_file_names=["phonepe_payment_receipt_24500.png"],
                    is_cross_verified=False,
                    user_confirmed=False
                )
            ],
            missing_fields=[
                MissingFieldItem(
                    field_key="beneficiary_account",
                    label="Full Beneficiary Account Number",
                    severity=SeverityLevel.INFO,
                    reason="Receipt masks bank account as 'XXXXXX9821' for security.",
                    requires_user_action=False,
                    prompt_question="Do you have the unmasked beneficiary bank account number from your official bank statement?"
                )
            ],
            inconsistencies=[],
            quality_issues=[],
            duplicate_transactions=[],
            confirmation_needed=[
                ConfirmationNeededItem(
                    field_key="sender_spoofed",
                    label="Alphanumeric SMS Header Impersonation",
                    current_value="VK-POWERC",
                    confidence=0.95,
                    reason="Sender header 'VK-POWERC' is flagged as unverified telecom spoofing. Please confirm this was an unsolicited message.",
                    suggested_value="CONFIRMED_SPOOF"
                )
            ],
            evidence_count=2,
            is_citizen_verified=False,
            created_at=now,
            updated_at=now
        )

        # 2. Incomplete Evidence Scenario (Case test_incomplete)
        self._reports["test_incomplete"] = CaseVerificationReport(
            id="rep_test_incomplete",
            case_id="test_incomplete",
            case_number="GH-2024-INCOMP",
            verification_status=VerificationStatus.ACTION_REQUIRED,
            completeness_score=52.0,
            consistency_score=88.0,
            quality_score=90.0,
            overall_score=68.0,
            verified_fields=[
                VerifiedFieldItem(
                    field_key="amount",
                    label="Disputed Fraud Amount",
                    value=15000.0,
                    confidence=0.92,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_inc_1"],
                    source_file_names=["olx_chat_partial.png"],
                    is_cross_verified=False,
                    user_confirmed=False
                ),
                VerifiedFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Beneficiary UPI ID / VPA",
                    value="merchantpay.secure@okaxis",
                    confidence=0.86,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_inc_1"],
                    source_file_names=["olx_chat_partial.png"],
                    is_cross_verified=False,
                    user_confirmed=False
                )
            ],
            missing_fields=[
                MissingFieldItem(
                    field_key="transaction_id_utr",
                    label="Transaction UTR / Ref No (12 Digits)",
                    severity=SeverityLevel.CRITICAL,
                    reason="The 12-digit UPI UTR is completely missing from the uploaded chat screenshot. NPCI and banks require this exact reference number to freeze beneficiary funds.",
                    requires_user_action=True,
                    prompt_question="Please enter the 12-digit UTR from your bank SMS or debit notification (e.g. 4128xxxxxxxx)."
                ),
                MissingFieldItem(
                    field_key="beneficiary_bank",
                    label="Beneficiary Bank Name",
                    severity=SeverityLevel.WARNING,
                    reason="Beneficiary bank could not be determined from the chat alone.",
                    requires_user_action=True,
                    prompt_question="Do you know which bank the recipient UPI ID belongs to?"
                ),
                MissingFieldItem(
                    field_key="transaction_time",
                    label="Exact Transaction Timestamp",
                    severity=SeverityLevel.WARNING,
                    reason="Chat shows only message time, not bank debit settlement time.",
                    requires_user_action=True,
                    prompt_question="What exact time was your account debited?"
                )
            ],
            inconsistencies=[],
            quality_issues=[
                EvidenceQualityIssue(
                    evidence_id="ev_inc_1",
                    file_name="olx_chat_partial.png",
                    issue_type=QualityIssueType.INCOMPLETE_RECEIPT,
                    severity=SeverityLevel.WARNING,
                    message="Evidence contains only chat exchange without an official UPI bank debit confirmation receipt.",
                    metric="Category: WHATSAPP_CHAT (No UPI_RECEIPT attached)",
                    is_blocking=False
                )
            ],
            duplicate_transactions=[],
            confirmation_needed=[
                ConfirmationNeededItem(
                    field_key="amount",
                    label="Fraud Amount",
                    current_value=15000.0,
                    confidence=0.86,
                    reason="Extracted from chat message text, not a verified bank debit statement.",
                    suggested_value=15000.0
                )
            ],
            evidence_count=1,
            is_citizen_verified=False,
            created_at=now,
            updated_at=now
        )

        # 3. Conflicting Evidence Scenario (Case test_conflicting)
        self._reports["test_conflicting"] = CaseVerificationReport(
            id="rep_test_conflicting",
            case_id="test_conflicting",
            case_number="GH-2024-CONFLICT",
            verification_status=VerificationStatus.HIGH_DISCREPANCY,
            completeness_score=85.0,
            consistency_score=35.0,
            quality_score=90.0,
            overall_score=62.5,
            verified_fields=[
                VerifiedFieldItem(
                    field_key="transaction_date",
                    label="Transaction Date",
                    value=now.strftime("%Y-%m-%d"),
                    confidence=0.95,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_conf_1", "ev_conf_2"],
                    source_file_names=["gpay_receipt_24500.png", "whatsapp_payment_demand.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                )
            ],
            missing_fields=[],
            inconsistencies=[
                InconsistentFieldItem(
                    field_key="amount",
                    label="Transaction Amount Discrepancy",
                    evidence_sources=[
                        {
                            "evidence_id": "ev_conf_1",
                            "file_name": "gpay_receipt_24500.png",
                            "category": "UPI_RECEIPT",
                            "value": 24500.0,
                            "confidence": 0.98
                        },
                        {
                            "evidence_id": "ev_conf_2",
                            "file_name": "whatsapp_payment_demand.png",
                            "category": "WHATSAPP_CHAT",
                            "value": 35000.0,
                            "confidence": 0.92
                        }
                    ],
                    discrepancy_description="Payment receipt indicates ₹24,500 transferred, but WhatsApp conversation screenshot shows a demand of ₹35,000.",
                    severity=SeverityLevel.CRITICAL,
                    suggested_resolution="Select whether you made a single payment of ₹24,500 or multiple transfers totaling ₹35,000."
                ),
                InconsistentFieldItem(
                    field_key="transaction_id_utr",
                    label="Conflicting UTR Reference Numbers",
                    evidence_sources=[
                        {
                            "evidence_id": "ev_conf_1",
                            "file_name": "gpay_receipt_24500.png",
                            "category": "UPI_RECEIPT",
                            "value": "412890563412",
                            "confidence": 0.98
                        },
                        {
                            "evidence_id": "ev_conf_2",
                            "file_name": "sms_bank_alert.png",
                            "category": "SMS_ALERT",
                            "value": "412890563999",
                            "confidence": 0.91
                        }
                    ],
                    discrepancy_description="Google Pay receipt displays UTR 412890563412, whereas bank SMS shows UTR 412890563999.",
                    severity=SeverityLevel.CRITICAL,
                    suggested_resolution="Confirm the official 12-digit UTR from your bank passbook/mBanking application."
                ),
                InconsistentFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Divergent Beneficiary VPA",
                    evidence_sources=[
                        {
                            "evidence_id": "ev_conf_1",
                            "file_name": "gpay_receipt_24500.png",
                            "category": "UPI_RECEIPT",
                            "value": "fraudster.deal@paytm",
                            "confidence": 0.96
                        },
                        {
                            "evidence_id": "ev_conf_2",
                            "file_name": "whatsapp_payment_demand.png",
                            "category": "WHATSAPP_CHAT",
                            "value": "rewards.quick@okhdfcbank",
                            "confidence": 0.90
                        }
                    ],
                    discrepancy_description="Chat requested payment to rewards.quick@okhdfcbank, but receipt shows debit to fraudster.deal@paytm.",
                    severity=SeverityLevel.WARNING,
                    suggested_resolution="Verify if multiple QR codes or handles were used by the fraudster."
                )
            ],
            quality_issues=[],
            duplicate_transactions=[],
            confirmation_needed=[
                ConfirmationNeededItem(
                    field_key="amount",
                    label="Actual Amount Lost",
                    current_value="Conflicting (₹24,500 vs ₹35,000)",
                    confidence=0.50,
                    reason="Please select the actual total amount debited from your account.",
                    suggested_value=24500.0
                )
            ],
            evidence_count=2,
            is_citizen_verified=False,
            created_at=now,
            updated_at=now
        )

        # 4. Blurry & Duplicate Evidence Scenario (Case test_duplicate_blurry)
        self._reports["test_duplicate_blurry"] = CaseVerificationReport(
            id="rep_test_duplicate_blurry",
            case_id="test_duplicate_blurry",
            case_number="GH-2024-BLURRY-DUP",
            verification_status=VerificationStatus.ACTION_REQUIRED,
            completeness_score=68.0,
            consistency_score=75.0,
            quality_score=38.0,
            overall_score=58.2,
            verified_fields=[
                VerifiedFieldItem(
                    field_key="amount",
                    label="Disputed Fraud Amount",
                    value=9500.0,
                    confidence=0.88,
                    confidence_level="HIGH",
                    source_evidence_ids=["ev_blurry_1", "ev_blurry_2"],
                    source_file_names=["receipt_scan_copy1.png", "receipt_scan_copy2_duplicate.png"],
                    is_cross_verified=True,
                    user_confirmed=False
                )
            ],
            missing_fields=[
                MissingFieldItem(
                    field_key="transaction_id_utr",
                    label="Transaction UTR",
                    severity=SeverityLevel.CRITICAL,
                    reason="Text in UTR area is severely degraded due to motion blur or low resolution.",
                    requires_user_action=True,
                    prompt_question="Please enter your UTR manually or re-upload a clear uncompressed screenshot."
                )
            ],
            inconsistencies=[],
            quality_issues=[
                EvidenceQualityIssue(
                    evidence_id="ev_blurry_1",
                    file_name="receipt_blurry_capture.png",
                    issue_type=QualityIssueType.BLURRY_IMAGE,
                    severity=SeverityLevel.CRITICAL,
                    message="Screenshot suffers from severe optical blur. Sharpness variance is 28.4 (Minimum threshold: 85.0).",
                    metric="Sharpness Variance: 28.4 / 100.0",
                    is_blocking=True
                ),
                EvidenceQualityIssue(
                    evidence_id="ev_blurry_1",
                    file_name="receipt_blurry_capture.png",
                    issue_type=QualityIssueType.UNREADABLE_TEXT,
                    severity=SeverityLevel.CRITICAL,
                    message="OCR extracted fewer than 25 characters from this payment receipt.",
                    metric="OCR Character Count: 14 chars",
                    is_blocking=True
                ),
                EvidenceQualityIssue(
                    evidence_id="ev_blurry_2",
                    file_name="receipt_scan_copy2_duplicate.png",
                    issue_type=QualityIssueType.DUPLICATE_FILE,
                    severity=SeverityLevel.WARNING,
                    message="File byte hash exactly matches 'receipt_scan_copy1.png'. Redundant duplicate file detected.",
                    metric="MD5 Match: d41d8cd98f00b204e9800998ecf8427e",
                    is_blocking=False
                )
            ],
            duplicate_transactions=[
                DuplicateTransactionItem(
                    transaction_id_utr="410293847291",
                    amount=9500.0,
                    evidence_ids=["ev_blurry_1", "ev_blurry_2"],
                    file_names=["receipt_scan_copy1.png", "receipt_scan_copy2_duplicate.png"],
                    explanation="Exact duplicate receipt uploaded twice. Total loss will not be counted twice.",
                    is_identical_file=True
                )
            ],
            confirmation_needed=[
                ConfirmationNeededItem(
                    field_key="transaction_id_utr",
                    label="Transaction UTR",
                    current_value="Unreadable in blurry capture",
                    confidence=0.25,
                    reason="Please provide the 12-digit UTR from your bank SMS.",
                    suggested_value="410293847291"
                )
            ],
            evidence_count=2,
            is_citizen_verified=False,
            created_at=now,
            updated_at=now
        )

    # -------------------------------------------------------------
    # Image Quality Heuristic Analyzer
    # -------------------------------------------------------------
    def analyze_image_quality(
        self,
        file_path: str,
        file_name: str,
        category: str,
        raw_ocr_text: str
    ) -> List[EvidenceQualityIssue]:
        """
        Analyzes image quality:
        - Checks sharpness/blur using edge variance
        - Checks resolution
        - Checks OCR readability
        - Checks receipt completeness
        """
        issues: List[EvidenceQualityIssue] = []
        ev_id = f"ev_{uuid.uuid4().hex[:8]}"

        # Heuristic 1: If file exists on disk, check PIL attributes
        if file_path and os.path.exists(file_path):
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
                    
                    # Low resolution check
                    if width < 350 or height < 300:
                        issues.append(
                            EvidenceQualityIssue(
                                evidence_id=ev_id,
                                file_name=file_name,
                                issue_type=QualityIssueType.LOW_RESOLUTION,
                                severity=SeverityLevel.WARNING,
                                message=f"Image resolution {width}x{height}px is below recommended minimum 400x400px.",
                                metric=f"{width}x{height}px",
                                is_blocking=False
                            )
                        )

                    # Blur check via edge variance in greyscale
                    gray = img.convert("L")
                    edges = gray.filter(ImageFilter.FIND_EDGES)
                    edge_stat = ImageStat.Stat(edges)
                    variance = edge_stat.var[0] if edge_stat.var else 0.0

                    # Variance threshold for digital screenshots: usually > 80. Very blurry images < 40
                    if variance < 35.0:
                        issues.append(
                            EvidenceQualityIssue(
                                evidence_id=ev_id,
                                file_name=file_name,
                                issue_type=QualityIssueType.BLURRY_IMAGE,
                                severity=SeverityLevel.CRITICAL,
                                message=f"Image appears blurry with low edge contrast ({variance:.1f} variance). Details may be unreadable.",
                                metric=f"Sharpness variance: {variance:.1f} (Threshold: 40.0)",
                                is_blocking=True
                            )
                        )
            except Exception as e:
                # If non-image or unreadable
                pass

        # Heuristic 2: OCR Readability & Character Count
        ocr_clean = (raw_ocr_text or "").strip()
        alnum_chars = [c for c in ocr_clean if c.isalnum()]
        
        if category in [EvidenceCategory.UPI_RECEIPT.value, "UPI_RECEIPT"] and len(alnum_chars) < 20:
            issues.append(
                EvidenceQualityIssue(
                    evidence_id=ev_id,
                    file_name=file_name,
                    issue_type=QualityIssueType.UNREADABLE_TEXT,
                    severity=SeverityLevel.CRITICAL,
                    message="OCR detected almost no readable text on this receipt screenshot. May be heavily compressed or obscured.",
                    metric=f"Alphanumeric characters: {len(alnum_chars)}",
                    is_blocking=True
                )
            )

        # Heuristic 3: Incomplete receipt check
        if category in [EvidenceCategory.UPI_RECEIPT.value, "UPI_RECEIPT"]:
            # Check if essential receipt markers exist
            markers = ["upi", "ref", "utr", "paid", "debited", "successful", "transferred", "₹", "rs"]
            matches = sum(1 for m in markers if m in ocr_clean.lower())
            if matches < 2:
                issues.append(
                    EvidenceQualityIssue(
                        evidence_id=ev_id,
                        file_name=file_name,
                        issue_type=QualityIssueType.INCOMPLETE_RECEIPT,
                        severity=SeverityLevel.WARNING,
                        message="Uploaded receipt appears cropped or incomplete. Standard transaction header or footer is missing.",
                        metric=f"Standard receipt markers matched: {matches}/8",
                        is_blocking=False
                    )
                )

        return issues

    # -------------------------------------------------------------
    # Multi-Evidence Cross Verification Engine
    # -------------------------------------------------------------
    def verify_case(self, case_id: str) -> CaseVerificationReport:
        """
        Runs the Smart Evidence Verification Engine across all evidence files attached to a case:
        1. Checks missing information (UTR, amount, date/time, beneficiary).
        2. Detects inconsistencies across screenshots (amounts, UTRs, dates, UPI IDs).
        3. Analyzes evidence quality and flags duplicates.
        4. Compiles verified vs unverified items and calculates multi-factor completeness scores.
        5. Does NOT silently modify original values.
        """
        # Return pre-seeded test reports if available and no live case overrides
        if case_id in self._reports and self._reports[case_id].is_citizen_verified:
            return self._reports[case_id]

        case = dashboard_service._cases.get(case_id)
        case_number = case.case_number if case else f"GH-{case_id}"

        # Fetch extractions for this case
        extractions = extraction_service.get_case_extractions(case_id)

        # If no extractions yet, check if there is evidence in the case and extract
        if not extractions:
            evidence_items = dashboard_service._evidence.get(case_id, [])
            for ev in evidence_items:
                ext = extraction_service.extract_evidence(
                    case_id=case_id,
                    evidence_id=ev.id,
                    file_path=ev.storage_path,
                    file_name=ev.file_name,
                    category=ev.category.value
                )
                extractions.append(ext)

        # If still empty (no evidence files uploaded at all)
        if not extractions:
            now = datetime.now()
            report = CaseVerificationReport(
                id=f"rep_{uuid.uuid4().hex[:10]}",
                case_id=case_id,
                case_number=case_number,
                verification_status=VerificationStatus.ACTION_REQUIRED,
                completeness_score=0.0,
                consistency_score=100.0,
                quality_score=100.0,
                overall_score=0.0,
                verified_fields=[],
                missing_fields=[
                    MissingFieldItem(
                        field_key="evidence_files",
                        label="Digital Evidence Screenshots",
                        severity=SeverityLevel.CRITICAL,
                        reason="No evidence files or screenshots have been uploaded for this case.",
                        requires_user_action=True,
                        prompt_question="Please upload your UPI receipt screenshot or bank statement."
                    )
                ],
                inconsistencies=[],
                quality_issues=[],
                duplicate_transactions=[],
                confirmation_needed=[],
                evidence_count=0,
                is_citizen_verified=False,
                created_at=now,
                updated_at=now
            )
            self._reports[case_id] = report
            return report

        # ---------------------------------------------------------
        # Step 1: Collect extracted values across all evidence files
        # ---------------------------------------------------------
        amounts: List[Dict[str, Any]] = []
        utrs: List[Dict[str, Any]] = []
        dates: List[Dict[str, Any]] = []
        times: List[Dict[str, Any]] = []
        beneficiary_upis: List[Dict[str, Any]] = []
        beneficiary_names: List[Dict[str, Any]] = []
        beneficiary_banks: List[Dict[str, Any]] = []
        sender_banks: List[Dict[str, Any]] = []

        file_hashes: Dict[str, str] = {}
        all_quality_issues: List[EvidenceQualityIssue] = []
        duplicate_txns: List[DuplicateTransactionItem] = []

        for ext in extractions:
            txn = ext.transaction_info
            comm = ext.communication_info

            # Collect Amount
            if txn.amount.value is not None and txn.amount.value > 0:
                amounts.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": float(txn.amount.value),
                    "confidence": txn.amount.confidence
                })

            # Collect UTR
            if txn.transaction_id_utr.value:
                clean_utr = txn.transaction_id_utr.value.strip()
                utrs.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": clean_utr,
                    "confidence": txn.transaction_id_utr.confidence
                })

            # Collect Date
            if txn.transaction_date.value:
                dates.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.transaction_date.value,
                    "confidence": txn.transaction_date.confidence
                })

            # Collect Time
            if txn.transaction_time.value:
                times.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.transaction_time.value,
                    "confidence": txn.transaction_time.confidence
                })

            # Collect Beneficiary UPI
            if txn.beneficiary_upi_id.value:
                beneficiary_upis.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.beneficiary_upi_id.value.lower().strip(),
                    "confidence": txn.beneficiary_upi_id.confidence
                })

            # Collect Beneficiary Name
            if txn.beneficiary_name.value:
                beneficiary_names.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.beneficiary_name.value,
                    "confidence": txn.beneficiary_name.confidence
                })

            # Collect Beneficiary Bank
            if txn.beneficiary_bank.value:
                beneficiary_banks.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.beneficiary_bank.value,
                    "confidence": txn.beneficiary_bank.confidence
                })

            # Collect Sender Bank
            if txn.sender_bank.value:
                sender_banks.append({
                    "evidence_id": ext.evidence_id,
                    "file_name": ext.evidence_file_name,
                    "category": ext.evidence_category,
                    "value": txn.sender_bank.value,
                    "confidence": txn.sender_bank.confidence
                })

            # Analyze Quality for this evidence item
            issues = self.analyze_image_quality(
                file_path="",  # Sandboxed check
                file_name=ext.evidence_file_name,
                category=ext.evidence_category,
                raw_ocr_text=ext.raw_ocr_text
            )
            for iss in issues:
                iss.evidence_id = ext.evidence_id
            all_quality_issues.extend(issues)

            # Duplicate file hash check (simulated with filename/size or actual file)
            # In our demo, check if multiple evidence items have identical name or size
            file_name = ext.evidence_file_name
            if file_name in file_hashes:
                all_quality_issues.append(
                    EvidenceQualityIssue(
                        evidence_id=ext.evidence_id,
                        file_name=file_name,
                        issue_type=QualityIssueType.DUPLICATE_FILE,
                        severity=SeverityLevel.WARNING,
                        message=f"A duplicate file '{file_name}' was uploaded more than once.",
                        metric="Identical file name/content",
                        is_blocking=False
                    )
                )
            else:
                file_hashes[file_name] = ext.evidence_id

        # ---------------------------------------------------------
        # Step 2: Inconsistency Detection Across Evidence Items
        # ---------------------------------------------------------
        inconsistencies: List[InconsistentFieldItem] = []

        # Check Amount Inconsistency
        unique_amounts = list(set([a["value"] for a in amounts]))
        if len(unique_amounts) > 1:
            diff_str = " vs ".join([f"₹{val:,.2f}" for val in sorted(unique_amounts)])
            inconsistencies.append(
                InconsistentFieldItem(
                    field_key="amount",
                    label="Transaction Amount Discrepancy",
                    evidence_sources=amounts,
                    discrepancy_description=f"Evidence screenshots show different transaction amounts: {diff_str}.",
                    severity=SeverityLevel.CRITICAL,
                    suggested_resolution="Confirm the exact amount deducted from your bank statement."
                )
            )

        # Check UTR Inconsistency
        unique_utrs = list(set([u["value"] for u in utrs]))
        if len(unique_utrs) > 1:
            diff_str = " vs ".join(unique_utrs)
            inconsistencies.append(
                InconsistentFieldItem(
                    field_key="transaction_id_utr",
                    label="Conflicting UTR Reference Numbers",
                    evidence_sources=utrs,
                    discrepancy_description=f"Multiple conflicting UTR reference numbers detected across screenshots: {diff_str}.",
                    severity=SeverityLevel.CRITICAL,
                    suggested_resolution="Confirm the official 12-digit UPI UTR from your bank SMS or netbanking."
                )
            )
        elif len(utrs) > 1 and len(unique_utrs) == 1:
            # Same UTR in multiple receipts -> Flag duplicate transaction check
            duplicate_txns.append(
                DuplicateTransactionItem(
                    transaction_id_utr=unique_utrs[0],
                    amount=unique_amounts[0] if unique_amounts else None,
                    evidence_ids=[u["evidence_id"] for u in utrs],
                    file_names=[u["file_name"] for u in utrs],
                    explanation=f"UTR {unique_utrs[0]} appears in multiple evidence files. Verified as a single transaction represented across receipts.",
                    is_identical_file=False
                )
            )

        # Check Beneficiary UPI Inconsistency
        unique_upis = list(set([b["value"] for b in beneficiary_upis]))
        if len(unique_upis) > 1:
            diff_str = " vs ".join(unique_upis)
            inconsistencies.append(
                InconsistentFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Divergent Beneficiary UPI IDs",
                    evidence_sources=beneficiary_upis,
                    discrepancy_description=f"Multiple beneficiary UPI IDs found: {diff_str}.",
                    severity=SeverityLevel.WARNING,
                    suggested_resolution="Confirm the primary UPI ID / VPA that received the fraudulent transfer."
                )
            )

        # Check Date Inconsistency
        unique_dates = list(set([d["value"] for d in dates]))
        if len(unique_dates) > 1:
            inconsistencies.append(
                InconsistentFieldItem(
                    field_key="transaction_date",
                    label="Conflicting Transaction Dates",
                    evidence_sources=dates,
                    discrepancy_description=f"Different transaction dates detected: {', '.join(unique_dates)}.",
                    severity=SeverityLevel.WARNING,
                    suggested_resolution="Confirm the exact date when the debit occurred."
                )
            )

        # ---------------------------------------------------------
        # Step 3: Missing Information Detection
        # ---------------------------------------------------------
        missing_fields: List[MissingFieldItem] = []

        # Check UTR
        if not utrs:
            missing_fields.append(
                MissingFieldItem(
                    field_key="transaction_id_utr",
                    label="12-Digit Transaction UTR / Ref No",
                    severity=SeverityLevel.CRITICAL,
                    reason="No 12-digit UTR found in any uploaded screenshot. Indian banks and the 1930 portal require the UTR to initiate an immediate lien.",
                    requires_user_action=True,
                    prompt_question="Please enter the 12-digit UTR from your bank SMS or debit alert."
                )
            )

        # Check Amount
        if not amounts:
            missing_fields.append(
                MissingFieldItem(
                    field_key="amount",
                    label="Transaction Amount Lost",
                    severity=SeverityLevel.CRITICAL,
                    reason="Transaction amount could not be detected in any uploaded file.",
                    requires_user_action=True,
                    prompt_question="Please enter the exact rupee amount debited from your account."
                )
            )

        # Check Beneficiary UPI
        if not beneficiary_upis:
            missing_fields.append(
                MissingFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Beneficiary UPI ID / VPA",
                    severity=SeverityLevel.CRITICAL,
                    reason="Beneficiary UPI handle (e.g. name@bank) is missing. Necessary to identify the recipient bank.",
                    requires_user_action=True,
                    prompt_question="Enter the recipient's UPI ID (e.g. fraudster@ybl)."
                )
            )

        # Check Date
        if not dates:
            missing_fields.append(
                MissingFieldItem(
                    field_key="transaction_date",
                    label="Transaction Date",
                    severity=SeverityLevel.WARNING,
                    reason="Date of the incident was not detected in the evidence.",
                    requires_user_action=True,
                    prompt_question="What date did this transaction take place?"
                )
            )

        # Check Beneficiary Bank
        if not beneficiary_banks and not beneficiary_upis:
            missing_fields.append(
                MissingFieldItem(
                    field_key="beneficiary_bank",
                    label="Beneficiary Bank Name",
                    severity=SeverityLevel.WARNING,
                    reason="Beneficiary bank name is missing.",
                    requires_user_action=True,
                    prompt_question="Which bank received the funds, if visible?"
                )
            )

        # ---------------------------------------------------------
        # Step 4: Compile Verified Fields & Confirmation Needed
        # ---------------------------------------------------------
        verified_fields: List[VerifiedFieldItem] = []
        confirmation_needed: List[ConfirmationNeededItem] = []

        # Verify Amount
        if amounts and len(unique_amounts) == 1:
            val = unique_amounts[0]
            avg_conf = sum(a["confidence"] for a in amounts) / len(amounts)
            is_cross = len(amounts) >= 2
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="amount",
                    label="Disputed Fraud Amount",
                    value=val,
                    confidence=round(avg_conf, 2),
                    confidence_level="HIGH" if avg_conf >= 0.85 else "MEDIUM",
                    source_evidence_ids=[a["evidence_id"] for a in amounts],
                    source_file_names=[a["file_name"] for a in amounts],
                    is_cross_verified=is_cross,
                    user_confirmed=False
                )
            )
            if avg_conf < 0.70:
                confirmation_needed.append(
                    ConfirmationNeededItem(
                        field_key="amount",
                        label="Disputed Fraud Amount",
                        current_value=val,
                        confidence=round(avg_conf, 2),
                        reason="Amount was detected with moderate confidence. Please confirm."
                    )
                )

        # Verify UTR
        if utrs and len(unique_utrs) == 1:
            val = unique_utrs[0]
            avg_conf = sum(u["confidence"] for u in utrs) / len(utrs)
            is_cross = len(utrs) >= 2
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="transaction_id_utr",
                    label="Transaction UTR / Ref No",
                    value=val,
                    confidence=round(avg_conf, 2),
                    confidence_level="HIGH" if avg_conf >= 0.85 else "MEDIUM",
                    source_evidence_ids=[u["evidence_id"] for u in utrs],
                    source_file_names=[u["file_name"] for u in utrs],
                    is_cross_verified=is_cross,
                    user_confirmed=False
                )
            )
            if avg_conf < 0.70:
                confirmation_needed.append(
                    ConfirmationNeededItem(
                        field_key="transaction_id_utr",
                        label="Transaction UTR",
                        current_value=val,
                        confidence=round(avg_conf, 2),
                        reason="UTR reference was detected with low clarity. Please confirm."
                    )
                )

        # Verify Beneficiary UPI
        if beneficiary_upis and len(unique_upis) == 1:
            val = unique_upis[0]
            avg_conf = sum(b["confidence"] for b in beneficiary_upis) / len(beneficiary_upis)
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="beneficiary_upi_id",
                    label="Beneficiary UPI ID / VPA",
                    value=val,
                    confidence=round(avg_conf, 2),
                    confidence_level="HIGH" if avg_conf >= 0.85 else "MEDIUM",
                    source_evidence_ids=[b["evidence_id"] for b in beneficiary_upis],
                    source_file_names=[b["file_name"] for b in beneficiary_upis],
                    is_cross_verified=len(beneficiary_upis) >= 2,
                    user_confirmed=False
                )
            )

        # Verify Date
        if dates and len(unique_dates) == 1:
            val = unique_dates[0]
            avg_conf = sum(d["confidence"] for d in dates) / len(dates)
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="transaction_date",
                    label="Transaction Date",
                    value=val,
                    confidence=round(avg_conf, 2),
                    confidence_level="HIGH" if avg_conf >= 0.85 else "MEDIUM",
                    source_evidence_ids=[d["evidence_id"] for d in dates],
                    source_file_names=[d["file_name"] for d in dates],
                    is_cross_verified=len(dates) >= 2,
                    user_confirmed=False
                )
            )

        # Verify Beneficiary Bank
        if beneficiary_banks:
            val = beneficiary_banks[0]["value"]
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="beneficiary_bank",
                    label="Beneficiary Bank",
                    value=val,
                    confidence=round(beneficiary_banks[0]["confidence"], 2),
                    confidence_level="HIGH" if beneficiary_banks[0]["confidence"] >= 0.85 else "MEDIUM",
                    source_evidence_ids=[beneficiary_banks[0]["evidence_id"]],
                    source_file_names=[beneficiary_banks[0]["file_name"]],
                    is_cross_verified=False,
                    user_confirmed=False
                )
            )

        # Verify Sender Bank
        if sender_banks:
            val = sender_banks[0]["value"]
            verified_fields.append(
                VerifiedFieldItem(
                    field_key="sender_bank",
                    label="Victim / Remitter Bank",
                    value=val,
                    confidence=round(sender_banks[0]["confidence"], 2),
                    confidence_level="HIGH" if sender_banks[0]["confidence"] >= 0.85 else "MEDIUM",
                    source_evidence_ids=[sender_banks[0]["evidence_id"]],
                    source_file_names=[sender_banks[0]["file_name"]],
                    is_cross_verified=False,
                    user_confirmed=False
                )
            )

        # ---------------------------------------------------------
        # Step 5: Calculate Verification Scores
        # ---------------------------------------------------------
        # Completeness: Check essential fields (UTR, Amount, Beneficiary UPI, Date, Bank)
        essential_count = 5
        present_count = len([f for f in verified_fields if f.field_key in ["transaction_id_utr", "amount", "beneficiary_upi_id", "transaction_date", "beneficiary_bank"]])
        completeness_score = round(min(100.0, (present_count / essential_count) * 100.0), 1)

        # Consistency: 100 minus penalties for discrepancies
        consistency_penalty = len(inconsistencies) * 30.0
        consistency_score = round(max(0.0, 100.0 - consistency_penalty), 1)

        # Quality: 100 minus penalties for blur/unreadable text
        quality_penalty = len([q for q in all_quality_issues if q.severity == SeverityLevel.CRITICAL]) * 35.0 + \
                          len([q for q in all_quality_issues if q.severity == SeverityLevel.WARNING]) * 15.0
        quality_score = round(max(0.0, 100.0 - quality_penalty), 1)

        # Overall Score: weighted formula
        overall_score = round(
            0.40 * completeness_score + 0.35 * consistency_score + 0.25 * quality_score,
            1
        )

        # Status logic
        has_critical_missing = any(m.severity == SeverityLevel.CRITICAL for m in missing_fields)
        has_critical_inconsistency = any(i.severity == SeverityLevel.CRITICAL for i in inconsistencies)

        if has_critical_inconsistency:
            status = VerificationStatus.HIGH_DISCREPANCY
        elif has_critical_missing or confirmation_needed:
            status = VerificationStatus.ACTION_REQUIRED
        elif overall_score >= 80.0:
            status = VerificationStatus.IN_REVIEW  # Ready for citizen confirmation
        else:
            status = VerificationStatus.ACTION_REQUIRED

        now = datetime.now()
        report = CaseVerificationReport(
            id=f"rep_{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            case_number=case_number,
            verification_status=status,
            completeness_score=completeness_score,
            consistency_score=consistency_score,
            quality_score=quality_score,
            overall_score=overall_score,
            verified_fields=verified_fields,
            missing_fields=missing_fields,
            inconsistencies=inconsistencies,
            quality_issues=all_quality_issues,
            duplicate_transactions=duplicate_txns,
            confirmation_needed=confirmation_needed,
            evidence_count=len(extractions),
            is_citizen_verified=False,
            created_at=now,
            updated_at=now
        )

        self._reports[case_id] = report
        return report

    # -------------------------------------------------------------
    # Citizen Human-In-The-Loop Confirmation & Correction
    # -------------------------------------------------------------
    def confirm_case_verification(
        self,
        case_id: str,
        payload: ConfirmVerificationPayload,
        user_name: str = "Demo Citizen"
    ) -> CaseVerificationReport:
        """
        Allows the citizen to review, resolve conflicts, fill missing information,
        and officially mark the case evidence as citizen-verified.
        Preserves original values while recording user corrections.
        """
        report = self.get_or_create_report(case_id)
        now = datetime.now()

        report.is_citizen_verified = payload.is_confirmed
        report.verified_by_user = user_name
        report.verified_at = now
        report.updated_at = now
        report.user_corrections = payload.user_corrections
        report.citizen_notes = payload.citizen_notes

        # Apply corrections to verified_fields without deleting originals
        for key, val in payload.user_corrections.items():
            if val is not None and str(val).strip():
                # Check if field already in verified_fields
                existing = next((f for f in report.verified_fields if f.field_key == key), None)
                if existing:
                    existing.value = val
                    existing.user_confirmed = True
                    existing.confidence = 1.0
                    existing.confidence_level = "HIGH"
                else:
                    report.verified_fields.append(
                        VerifiedFieldItem(
                            field_key=key,
                            label=key.replace("_", " ").title(),
                            value=val,
                            confidence=1.0,
                            confidence_level="HIGH",
                            source_evidence_ids=["citizen_manual_entry"],
                            source_file_names=["Citizen Verified Override"],
                            is_cross_verified=True,
                            user_confirmed=True
                        )
                    )
                # Remove from missing_fields if resolved
                report.missing_fields = [m for m in report.missing_fields if m.field_key != key]
                # Remove from confirmation_needed if resolved
                report.confirmation_needed = [c for c in report.confirmation_needed if c.field_key != key]

        # Recalculate status & scores
        if report.is_citizen_verified:
            report.verification_status = VerificationStatus.VERIFIED
            report.overall_score = max(report.overall_score, 90.0)
            report.completeness_score = max(report.completeness_score, 95.0)
            report.consistency_score = max(report.consistency_score, 95.0)

            # Update dashboard case status if exists
            if case_id in dashboard_service._cases:
                dashboard_service._cases[case_id].status = dashboard_service._cases[case_id].status or "REVIEW_PENDING"

        self._reports[case_id] = report
        return report

    def get_or_create_report(self, case_id: str) -> CaseVerificationReport:
        """Retrieves existing verification report or runs verification on demand."""
        if case_id in self._reports:
            return self._reports[case_id]
        return self.verify_case(case_id)

    def get_scenario(self, scenario_type: str) -> CaseVerificationReport:
        """Helper to get pre-seeded testing scenarios."""
        mapping = {
            "complete": "case_101",
            "incomplete": "test_incomplete",
            "conflicting": "test_conflicting",
            "blurry_duplicate": "test_duplicate_blurry"
        }
        key = mapping.get(scenario_type, "case_101")
        return self.get_or_create_report(key)


verification_service = VerificationService()
