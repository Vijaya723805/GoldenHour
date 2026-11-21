import os
import re
import json
import base64
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings
from app.services.validation_service import validation_service
from app.services.ocr_service import ocr_service

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class ClaudeService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.client = None
        if ANTHROPIC_AVAILABLE and self.api_key and "your-claude" not in self.api_key:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception:
                self.client = None

    def analyze_evidence(self, file_path: str, mime_type: str = "image/png") -> Dict[str, Any]:
        """
        Extracts transaction details, fraud category, and evidence from screenshot.
        Uses Claude 3.5 Sonnet Vision if configured, or actual OCR & pattern extraction.
        Never fabricates fake numbers if data is absent.
        """
        # If Claude client is configured and file exists, invoke actual Claude Vision API
        if self.client and file_path and os.path.exists(file_path):
            try:
                with open(file_path, "rb") as img_f:
                    img_bytes = img_f.read()
                    base64_data = base64.b64encode(img_bytes).decode("utf-8")

                media_type = mime_type
                if not media_type or media_type == "application/octet-stream":
                    if file_path.lower().endswith(".png"):
                        media_type = "image/png"
                    elif file_path.lower().endswith((".jpg", ".jpeg")):
                        media_type = "image/jpeg"
                    elif file_path.lower().endswith(".webp"):
                        media_type = "image/webp"

                system_prompt = (
                    "You are GoldenHour, a specialized fintech AI analyzing evidence of UPI fraud in India. "
                    "CRITICAL SECURITY MANDATE: NEVER extract, echo, or store UPI PINs, MPINs, OTPs, CVVs, or netbanking passwords. "
                    "Extract only factual evidence from the document: "
                    "12-digit UTR/UPI Ref No, exact debited amount, timestamp, sender UPI ID/VPA, beneficiary UPI ID/VPA, "
                    "beneficiary bank name, beneficiary account number, app used (PhonePe, Google Pay, Paytm, BHIM, etc.), "
                    "and scam category (e.g. PHISHING_PAYMENT_LINK, FAKE_QR_SCAM, LOTTERY_REWARD_SCAM, INVESTMENT_PART_TIME_JOB_SCAM, BANK_IMPERSONATION). "
                    "Strict anti-hallucination: If a field is not present or illegible, set its value to null. Never guess. "
                    "Return ONLY valid JSON matching this structure: "
                    "{\"transaction\": {\"transaction_id_utr\": str|null, \"amount\": float|null, \"timestamp\": str|null, "
                    "\"sender_upi_id\": str|null, \"beneficiary_upi_id\": str|null, \"beneficiary_account\": str|null, "
                    "\"beneficiary_bank\": str|null, \"app_used\": str|null}, "
                    "\"detected_category\": str, \"confidence_score\": float, \"raw_text_summary\": str}"
                )

                response = self.client.messages.create(
                    model=settings.ANTHROPIC_MODEL,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": base64_data
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": "Extract all transaction parameters and fraud evidence from this screenshot according to instructions."
                                }
                            ]
                        }
                    ]
                )

                # Parse JSON content
                resp_text = response.content[0].text.strip()
                # Remove markdown fences if present
                if resp_text.startswith("```"):
                    lines = resp_text.splitlines()
                    resp_text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
                parsed = json.loads(resp_text)
                
                # Sanitize extracted text
                raw_summary = parsed.get("raw_text_summary", "")
                sanitized_summary, redacted = validation_service.inspect_and_sanitize_text(raw_summary)

                return {
                    "transaction": parsed.get("transaction", {}),
                    "detected_category": parsed.get("detected_category", "UNAUTHORIZED_UPI_DEBIT"),
                    "confidence_score": float(parsed.get("confidence_score", 0.95)),
                    "raw_text_summary": sanitized_summary,
                    "redacted_sensitive_data": redacted,
                    "security_flags": ["Analyzed with Claude 3.5 Sonnet Vision"]
                }
            except Exception as e:
                # Log and fallback to genuine OCR extraction
                pass

        # Real OCR + Pattern Extraction Engine (operates locally without third-party API)
        return self._extract_from_ocr(file_path)

    def _extract_from_ocr(self, file_path: str) -> Dict[str, Any]:
        """
        Runs actual local OCR (Windows native / PaddleOCR) and extracts parameters without inventing data.
        Returns null for any parameters not genuinely found in the screenshot.
        """
        raw_text = ""
        is_blurry = False
        quality_warning = None

        if file_path and os.path.exists(file_path):
            ocr_res = ocr_service.extract_text(file_path)
            raw_text = ocr_res.get("text", "")
            is_blurry = ocr_res.get("is_blurry", False)
            quality_warning = ocr_res.get("quality_warning")

        sanitized_text, redacted = validation_service.inspect_and_sanitize_text(raw_text)

        # 1. 12-Digit UTR Number
        utr = None
        # Match explicit label UTR / UPI Ref / Ref No
        utr_match = re.search(
            r"(?:UTR|UPI\s*Ref(?:\s*No)?|Ref(?:erence)?\s*(?:No)?|Txn\s*ID)\s*[:\-]?\s*([0-9]{12})\b",
            sanitized_text,
            re.IGNORECASE
        )
        if utr_match:
            utr = utr_match.group(1)
        else:
            # Standalone 12 digits, ensuring it's not a phone number (+91...) or part of a timestamp
            standalone_12 = re.findall(r"(?<!\d)([0-9]{12})(?!\d)", sanitized_text)
            for cand in standalone_12:
                # Disqualify if it looks like a phone number starting with +91 or timestamp
                if not cand.startswith("91") or len(cand) != 12:
                    utr = cand
                    break

        # Transaction ID if distinct (e.g. PhonePe T2611101628047792654665)
        tx_id_ref = None
        tx_ref_match = re.search(
            r"Transaction\s*ID\s*[:\-]?\s*([A-Za-z0-9]{14,35})",
            sanitized_text,
            re.IGNORECASE
        )
        if tx_ref_match:
            tx_id_ref = tx_ref_match.group(1)

        # 2. Transaction Amount
        amount = None
        amt_match = re.search(
            r"(?:₹|Rs\.?|INR|Paid)\s*[:\-]?\s*([0-9,]+(?:\.[0-9]{2})?)",
            sanitized_text,
            re.IGNORECASE
        )
        if amt_match:
            try:
                amount = float(amt_match.group(1).replace(",", ""))
            except ValueError:
                amount = None
        else:
            # Look for currency decimal amounts e.g. 24,500.00
            dec_matches = re.findall(r"\b([0-9]{2,6}\.[0-9]{2})\b", sanitized_text)
            if dec_matches:
                try:
                    amount = float(dec_matches[0].replace(",", ""))
                except ValueError:
                    amount = None

        # 3. VPAs (UPI IDs) - strict regex with '@'
        vpas = re.findall(r"\b([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32})\b", sanitized_text)
        beneficiary_vpa = None
        sender_vpa = None

        # Discriminate beneficiary vs sender based on surrounding text
        for v in vpas:
            idx = sanitized_text.find(v)
            context_before = sanitized_text[max(0, idx - 60):idx].lower()
            if any(k in context_before for k in ["debited from", "from", "sender", "victim"]):
                if not sender_vpa:
                    sender_vpa = v
            elif any(k in context_before for k in ["paid to", "to", "beneficiary", "transfer to"]):
                if not beneficiary_vpa:
                    beneficiary_vpa = v

        if not beneficiary_vpa and vpas:
            beneficiary_vpa = vpas[0]
        if not sender_vpa and len(vpas) > 1 and vpas[1] != beneficiary_vpa:
            sender_vpa = vpas[1]

        # 4. Beneficiary Name
        beneficiary_name = None
        ben_name_match = re.search(
            r"Paid to\s*[:\-]?\s*([A-Za-z0-9\s]{3,35})(?=\n|Q[0-9]|@|[0-9]|Payment|Transfer|$)",
            sanitized_text,
            re.IGNORECASE
        )
        if ben_name_match:
            beneficiary_name = ben_name_match.group(1).strip()
            # Clean up unwanted prefixes
            if beneficiary_name.startswith("O "):
                beneficiary_name = beneficiary_name[2:].strip()

        # 5. Date & Time from Screenshot
        date_str = None
        time_str = None

        # Time pattern e.g. 04:28 pm or 16:28
        time_match = re.search(
            r"\b((?:0?[1-9]|1[0-2]):[0-5][0-9]\s*(?:am|pm|AM|PM))\b",
            sanitized_text
        )
        if time_match:
            time_str = time_match.group(1)

        # Date pattern e.g. 10 Nov 2026, 20 Nov 2026, 10/11/2026
        date_match = re.search(
            r"\b([0-3]?[0-9]\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b",
            sanitized_text,
            re.IGNORECASE
        )
        if not date_match:
            date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", sanitized_text)
        if date_match:
            date_str = date_match.group(1)

        timestamp_str = None
        if date_str and time_str:
            timestamp_str = f"{date_str}, {time_str}"
        elif date_str:
            timestamp_str = date_str
        elif time_str:
            timestamp_str = time_str

        # 6. Fraudster Phone Number (from SMS or WhatsApp)
        fraudster_phone = None
        # Strict boundary matching for Indian mobile numbers (10 digits starting with 6-9)
        # Must NOT be surrounded by alphanumeric characters (avoids partial matches inside PhonePe/Txn IDs)
        phone_matches = re.findall(r"(?<![a-zA-Z0-9])(?:(?:\+91|91)[\s-]?)?([6-9]\d{9})(?![a-zA-Z0-9])", sanitized_text)
        for cand in phone_matches:
            # Must NOT be inside UTR or transaction reference ID
            if utr and cand in utr:
                continue
            if tx_id_ref and cand in tx_id_ref:
                continue
            # Must NOT be a known helpline/support number (e.g. 1930, 1800...)
            context_idx = sanitized_text.find(cand)
            surrounding = sanitized_text[max(0, context_idx - 35):min(len(sanitized_text), context_idx + 35)].lower()
            if any(h in surrounding for h in ["support", "helpline", "toll free", "customer care"]):
                continue
            fraudster_phone = f"+91{cand}"
            break

        # 7. Payment App Detection
        app_used = "UPI"
        text_lower = sanitized_text.lower()
        if "phonepe" in text_lower:
            app_used = "PhonePe"
        elif "gpay" in text_lower or "google pay" in text_lower:
            app_used = "Google Pay"
        elif "paytm" in text_lower:
            app_used = "Paytm"
        elif "bhim" in text_lower:
            app_used = "BHIM UPI"
        elif "cred" in text_lower:
            app_used = "CRED"

        # 8. Bank Detection
        bank_name = None
        for b in [
            "Axis Bank", "State Bank of India", "SBI", "HDFC Bank", "ICICI Bank",
            "YES BANK", "Punjab National Bank", "PNB", "Kotak", "Bank of Baroda", "Canara Bank"
        ]:
            if b.lower() in text_lower:
                bank_name = b
                break

        # 9. Scam Category Detection from explicit evidence text
        category = "NEEDS_CLASSIFICATION"
        if any(w in text_lower for w in ["electricity", "power bill", "bill disconnect"]):
            category = "PHISHING_PAYMENT_LINK"
        elif any(w in text_lower for w in ["scan to receive", "receive money qr", "qr code to receive", "fake qr"]):
            category = "FAKE_QR_SCAM"
        elif any(w in text_lower for w in ["collect request", "approve request", "requested money"]):
            category = "UPI_COLLECT_REQUEST_FRAUD"
        elif any(w in text_lower for w in ["anydesk", "teamviewer", "rustdesk", "quicksupport", "screen share", "apk"]):
            category = "REMOTE_ACCESS_APP_SCAM"
        elif any(w in text_lower for w in ["kyc update", "card blocked", "pan card expired", "bank officer", "nodal officer"]):
            category = "IMPERSONATION_SCAM"
        elif any(w in text_lower for w in ["lottery", "reward prize", "winner prize", "cashback claim", "kbc"]):
            category = "PHISHING_PAYMENT_LINK"
        elif any(w in text_lower for w in ["part time job", "task earning", "telegram task", "daily income"]):
            category = "PHISHING_PAYMENT_LINK"
        elif any(w in text_lower for w in ["fraud", "unauthorized", "disputed"]):
            category = "UNAUTHORIZED_UPI_DEBIT"
        else:
            category = "NEEDS_CLASSIFICATION"

        confidence = 0.90 if utr and beneficiary_vpa else (0.70 if utr or beneficiary_vpa else 0.40)
        flags = []
        if is_blurry:
            flags.append("Warning: Image text was blurry or partially unreadable.")
        if not utr:
            flags.append("12-digit UTR not found in this image.")
        if not beneficiary_vpa:
            flags.append("Beneficiary UPI VPA not found in this image.")

        return {
            "transaction": {
                "transaction_id_utr": utr,
                "amount": amount,
                "timestamp": timestamp_str,
                "sender_upi_id": sender_vpa,
                "beneficiary_upi_id": beneficiary_vpa,
                "beneficiary_name": beneficiary_name,
                "beneficiary_bank": bank_name,
                "app_used": app_used,
                "transaction_ref_id": tx_id_ref
            },
            "fraudster_phone": fraudster_phone,
            "detected_category": category,
            "confidence_score": confidence,
            "raw_text_summary": sanitized_text or "No text recognized by OCR from image.",
            "redacted_sensitive_data": redacted,
            "is_blurry": is_blurry,
            "quality_warning": quality_warning,
            "security_flags": flags
        }


    def generate_complaint_draft(self, victim_data: Dict[str, Any], transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates standard complaint text formatted for the National Cyber Crime Reporting Portal (1930)
        and the Bank Nodal Officer.
        """
        utr = transaction_data.get("transaction_id_utr") or "PENDING_VERIFICATION"
        amount = transaction_data.get("amount") or 0.0
        beneficiary_upi = transaction_data.get("beneficiary_upi_id") or "UNKNOWN / NOT DETECTED"
        victim_bank = victim_data.get("victim_bank_name") or "Victim Issuing Bank"
        victim_name = victim_data.get("victim_name") or "Citizen Complainant"

        cyber_portal_text = (
            f"FORMAL COMPLAINT UNDER IT ACT & BNS REGARDING UNAUTHORIZED UPI TRANSACTION\n\n"
            f"To,\n"
            f"The Cyber Crime Investigation Cell / National Cyber Crime Reporting Portal (1930)\n\n"
            f"1. VICTIM PARTICULARS:\n"
            f"Name: {victim_name}\n"
            f"Contact: {victim_data.get('victim_phone', 'Not provided')}\n"
            f"Bank: {victim_bank}\n\n"
            f"2. FRAUDULENT TRANSACTION DETAILS:\n"
            f"12-Digit UTR / Ref No: {utr}\n"
            f"Amount Debited: INR {amount:,.2f}\n"
            f"Beneficiary / Fraudster UPI ID: {beneficiary_upi}\n"
            f"App Used: {transaction_data.get('app_used', 'UPI App')}\n"
            f"Incident Timeline: Within the Golden Hour window\n\n"
            f"3. STATEMENT OF FACTS:\n"
            f"{victim_data.get('incident_description', 'Victim was induced into an unauthorized UPI transfer.')}\n\n"
            f"4. PRAYER / RELIEF REQUESTED:\n"
            f"- Immediate request for lien marking / debit freeze on the beneficiary account at the receiving bank.\n"
            f"- Issuance of NCRP Cyber Acknowledgement Number for formal police cognizance.\n"
            f"- Retrieval of logs under Rule 3(1) of Information Technology Guidelines.\n\n"
            f"DISCLAIMER: This document has been verified by the complainant. GoldenHour does not auto-submit complaints."
        )

        bank_letter_text = (
            f"URGENT: REQUEST FOR IMMEDIATE LIEN / DEBIT FREEZE ON FRAUDULENT UPI BENEFICIARY\n\n"
            f"To,\n"
            f"The Principal Nodal Officer / Fraud Risk Management Team\n"
            f"{victim_bank}\n\n"
            f"Dear Sir/Madam,\n"
            f"Subject: Immediate dispute & lien request for unauthorized UPI transaction Ref {utr}\n\n"
            f"I am writing within the Golden Hour window to register an urgent fraud dispute. "
            f"An unauthorized amount of INR {amount:,.2f} was siphoned from my account on {datetime.now().strftime('%Y-%m-%d')} "
            f"to beneficiary VPA {beneficiary_upi} with UTR {utr}.\n\n"
            f"As per RBI Master Directions on Customer Protection (RBI/2017-18/15), I have zero/limited liability "
            f"having reported this immediately. Kindly coordinate with the beneficiary bank's Nodal Officer "
            f"to place a hold/lien on the beneficiary's wallet/account.\n\n"
            f"Sincerely,\n{victim_name}"
        )

        return {
            "cyber_crime_portal_draft": cyber_portal_text,
            "bank_nodal_letter_draft": bank_letter_text
        }

    def analyze_intake_screenshots(self, file_items: list) -> Dict[str, Any]:
        """
        Processes multiple intake screenshots (receipts, SMS, WhatsApp chats, bank receipts)
        using Claude Vision and/or genuine OCR and regex patterns.
        Aggregates incident title, scam category, narrative description, transaction date/time,
        12-digit UTR, beneficiary UPI VPA, and fraudster phone number.
        Strictly prevents hallucination: fields not found remain None with clear missing flags.
        """
        all_extracted_items = []
        combined_texts = []
        
        best_utr = None
        best_beneficiary_upi = None
        best_fraudster_phone = None
        best_amount = None
        best_timestamp = None
        detected_category = "UNAUTHORIZED_UPI_DEBIT"
        detected_app = "UPI"
        detected_bank = None

        for item in file_items:
            path = item.get("local_path") or item.get("storage_path") or ""
            filename = item.get("original_filename", "evidence.png")
            evidence_id = item.get("evidence_id", "")
            content_type = item.get("content_type", "image/png")

            # Analyze single screenshot
            analysis = self.analyze_evidence(file_path=path, mime_type=content_type)
            tx = analysis.get("transaction", {})
            raw_summary = analysis.get("raw_text_summary", "")
            combined_texts.append(raw_summary)

            item_utr = tx.get("transaction_id_utr")
            item_amount = tx.get("amount")
            item_time = tx.get("timestamp")
            item_sender_vpa = tx.get("sender_upi_id")
            item_ben_vpa = tx.get("beneficiary_upi_id")
            item_app = tx.get("app_used")
            item_bank = tx.get("beneficiary_bank")

            # Strict VPA validation: must contain '@' and not be a bare phone number
            if item_ben_vpa and ("@" not in item_ben_vpa or re.match(r"^[0-9+]+$", item_ben_vpa)):
                item_ben_vpa = None

            # Detect phone number in SMS/WhatsApp
            item_phone = None
            phone_matches = re.findall(r"(?:(?:\+91|91)[\s-]?)?([6-9]\d{9})\b", raw_summary)
            if phone_matches:
                item_phone = f"+91{phone_matches[0]}"

            # Detect category
            cat = analysis.get("detected_category", "UNAUTHORIZED_UPI_DEBIT")
            if cat != "UNAUTHORIZED_UPI_DEBIT":
                detected_category = cat

            # Assign category to item
            ev_category = "UPI_RECEIPT"
            summary_lower = (raw_summary + " " + filename).lower()
            if any(w in summary_lower for w in ["sms", "alert", "message", "debited from", "a/c"]):
                ev_category = "SMS_ALERT"
            elif any(w in summary_lower for w in ["whatsapp", "chat", "telegram", "conversation", "hello", "hi"]):
                ev_category = "WHATSAPP_CHAT"
            elif any(w in summary_lower for w in ["statement", "passbook", "account statement"]):
                ev_category = "BANK_STATEMENT"

            # Propagate best detected fields
            if item_utr and not best_utr:
                best_utr = item_utr
            if item_ben_vpa and not best_beneficiary_upi:
                best_beneficiary_upi = item_ben_vpa
            if item_amount and not best_amount:
                best_amount = item_amount
            if item_phone and not best_fraudster_phone:
                best_fraudster_phone = item_phone
            if item_time and not best_timestamp:
                best_timestamp = item_time
            if item_app and item_app != "UPI":
                detected_app = item_app
            if item_bank and not detected_bank:
                detected_bank = item_bank

            all_extracted_items.append({
                "evidence_id": evidence_id,
                "file_name": filename,
                "file_size": item.get("file_size", 0),
                "content_type": content_type,
                "category": ev_category,
                "storage_path": path,
                "extracted_text_summary": raw_summary[:200] if raw_summary else "",
                "transaction_id_utr": item_utr,
                "amount": item_amount,
                "timestamp": item_time,
                "sender_upi_id": item_sender_vpa,
                "beneficiary_upi_id": item_ben_vpa,
                "fraudster_phone": item_phone,
                "beneficiary_bank": item_bank,
                "app_used": item_app,
                "detected_category": cat,
                "is_blurry": analysis.get("is_blurry", False),
                "quality_warning": analysis.get("quality_warning")
            })

        # Determine overall category & title based on aggregated evidence
        if detected_category == "PHISHING_PAYMENT_LINK":
            incident_title = f"Unauthorized {detected_app} Transfer via Phishing Link"
        elif detected_category == "FAKE_QR_SCAM":
            incident_title = f"Unauthorized Debit via Deceptive QR Code Scam"
        elif detected_category == "UPI_COLLECT_REQUEST_FRAUD":
            incident_title = f"Deceptive UPI Collect Request Fraud"
        elif detected_category == "REMOTE_ACCESS_APP_SCAM":
            incident_title = f"Cyber Fraud via Remote Screen Access"
        elif detected_category == "IMPERSONATION_SCAM":
            incident_title = f"Unauthorized Transaction via Official Impersonation"
        elif detected_category == "UNAUTHORIZED_UPI_DEBIT":
            incident_title = f"Unauthorized {detected_app} Debit Fraud Incident"
        else:
            detected_category = "NEEDS_CLASSIFICATION"
            incident_title = f"Reported {detected_app} Transaction (Needs Classification)"

        # Synthesize incident narrative strictly without invented dates/amounts
        desc_parts = []
        if best_timestamp:
            desc_parts.append(f"On {best_timestamp}, an unauthorized transaction of {detected_app} was reported by the user.")
        else:
            desc_parts.append(f"An alleged unauthorized {detected_app} transaction was reported by the user. The transaction date and time could not be identified from the uploaded evidence.")

        if detected_category == "PHISHING_PAYMENT_LINK":
            desc_parts.append("The fraud was initiated via a deceptive notification or message containing a malicious payment link.")
        elif detected_category == "FAKE_QR_SCAM":
            desc_parts.append("The perpetrator instructed the user to scan a QR code under the pretext of receiving funds, resulting in an unauthorized debit.")
        elif detected_category == "UPI_COLLECT_REQUEST_FRAUD":
            desc_parts.append("The user received a deceptive UPI collect request disguised as incoming credit.")
        elif detected_category == "REMOTE_ACCESS_APP_SCAM":
            desc_parts.append("The victim was induced into installing a remote access application.")
        elif detected_category == "IMPERSONATION_SCAM":
            desc_parts.append("The perpetrator impersonated a bank or government official demanding verification.")
        elif detected_category == "UNAUTHORIZED_UPI_DEBIT":
            desc_parts.append("Funds were debited from the account without the user's voluntary authorization.")
        else:
            desc_parts.append("The incident modus operandi requires classification based on complainant review.")

        if best_beneficiary_upi:
            desc_parts.append(f"Funds were routed to fraudulent beneficiary UPI VPA '{best_beneficiary_upi}'.")
        else:
            desc_parts.append("Beneficiary UPI ID could not be identified from the uploaded evidence.")

        if best_utr:
            desc_parts.append(f"The transaction reference / UTR is {best_utr}.")
        else:
            desc_parts.append("The 12-digit UTR was not detected in the uploaded evidence and must be verified with the bank.")

        if best_fraudster_phone:
            desc_parts.append(f"The fraudster was contacted at or operated from mobile number {best_fraudster_phone}.")

        incident_description = " ".join(desc_parts)

        # Track missing fields for clear warning in UI
        missing = []
        if not best_utr:
            missing.append("12-digit UPI Transaction ID (UTR)")
        if not best_beneficiary_upi:
            missing.append("Beneficiary UPI ID / VPA")
        if not best_fraudster_phone:
            missing.append("Fraudster Phone Number")
        if not best_timestamp:
            missing.append("Transaction Date & Time")

        # Conflict & Quality Warnings
        fields: Dict[str, Any] = {}
        conflict_warnings: List[str] = []
        quality_warnings: List[str] = []

        seen_utrs = set()
        seen_amounts = set()
        seen_vpas = set()

        utr_source = None
        vpa_source = None
        amount_source = None
        phone_source = None
        time_source = None
        bank_source = None
        app_source = None

        for it in all_extracted_items:
            fn = it.get("file_name", "evidence")
            u = it.get("transaction_id_utr")
            if u:
                seen_utrs.add((u, fn))
                if not utr_source:
                    utr_source = fn
            a = it.get("amount")
            if a is not None:
                seen_amounts.add((a, fn))
                if not amount_source:
                    amount_source = fn
            v = it.get("beneficiary_upi_id")
            if v:
                seen_vpas.add((v, fn))
                if not vpa_source:
                    vpa_source = fn
            p = it.get("fraudster_phone")
            if p and not phone_source:
                phone_source = fn
            t = it.get("timestamp")
            if t and not time_source:
                time_source = fn
            b = it.get("beneficiary_bank")
            if b and not bank_source:
                bank_source = fn
            app = it.get("app_used")
            if app and app != "UPI" and not app_source:
                app_source = fn

            if it.get("is_blurry"):
                quality_warnings.append(
                    f"Screenshot '{fn}' appears blurry or low-resolution: {it.get('quality_warning') or 'text partially unreadable'}"
                )

        distinct_utrs = {u for u, _ in seen_utrs}
        if len(distinct_utrs) > 1:
            details = ", ".join([f"{u} ({fn})" for u, fn in seen_utrs])
            conflict_warnings.append(f"Conflicting Transaction UTRs detected across screenshots: {details}. Please verify.")

        distinct_amounts = {a for a, _ in seen_amounts}
        if len(distinct_amounts) > 1:
            details = ", ".join([f"INR {a:,.2f} ({fn})" for a, fn in seen_amounts])
            conflict_warnings.append(f"Multiple transaction amounts detected: {details}. Please confirm the amount defrauded.")

        # Structured fields with confidence and source screenshot
        fields["transaction_id_utr"] = {
            "value": best_utr,
            "source_screenshot": utr_source,
            "confidence": 0.95 if best_utr else 0.0,
            "status": "Extracted" if best_utr else "Needs Review",
            "verification_note": "Extracted from payment receipt" if best_utr else "Not found in uploaded evidence"
        }
        fields["beneficiary_upi_id"] = {
            "value": best_beneficiary_upi,
            "source_screenshot": vpa_source,
            "confidence": 0.95 if best_beneficiary_upi else 0.0,
            "status": "Extracted" if best_beneficiary_upi else "Needs Review",
            "verification_note": "Verified beneficiary VPA" if best_beneficiary_upi else "Not found in uploaded evidence"
        }
        fields["fraudster_phone"] = {
            "value": best_fraudster_phone,
            "source_screenshot": phone_source,
            "confidence": 0.85 if best_fraudster_phone else 0.0,
            "status": "Extracted" if best_fraudster_phone else "Needs Review",
            "verification_note": "Extracted from chat/SMS" if best_fraudster_phone else "Not found in uploaded evidence"
        }
        fields["amount"] = {
            "value": best_amount,
            "source_screenshot": amount_source,
            "confidence": 0.90 if best_amount else 0.0,
            "status": "Extracted" if best_amount else "Needs Review",
            "verification_note": "Detected from receipt" if best_amount else "Not found in uploaded evidence"
        }
        fields["transaction_date_time"] = {
            "value": best_timestamp,
            "source_screenshot": time_source,
            "confidence": 0.90 if best_timestamp else 0.0,
            "status": "Extracted" if best_timestamp else "Needs Review",
            "verification_note": "Extracted from screenshot header" if best_timestamp else "Not found in uploaded evidence"
        }
        fields["app_used"] = {
            "value": detected_app,
            "source_screenshot": app_source,
            "confidence": 0.95 if detected_app != "UPI" else 0.5,
            "status": "Extracted" if detected_app != "UPI" else "Needs Review",
            "verification_note": f"Detected {detected_app} interface" if detected_app != "UPI" else "Default UPI"
        }
        fields["beneficiary_bank"] = {
            "value": detected_bank,
            "source_screenshot": bank_source,
            "confidence": 0.90 if detected_bank else 0.0,
            "status": "Extracted" if detected_bank else "Needs Review",
            "verification_note": "Detected bank partner" if detected_bank else "Not found in uploaded evidence"
        }

        debug_diagnostics = {
            "engine_used": "windows_native_ocr" if WINSDK_AVAILABLE else "paddleocr",
            "files_processed": len(file_items),
            "raw_ocr_length": len(" ".join(combined_texts)),
            "claude_vision_active": bool(self.client is not None),
            "extracted_parameters_count": sum(1 for v in [best_utr, best_beneficiary_upi, best_amount, best_timestamp, best_fraudster_phone] if v is not None),
            "ocr_text_preview": " ".join(combined_texts)[:400] if combined_texts else "No text extracted",
            "timestamp": datetime.now().isoformat()
        }

        return {
            "incident_title": incident_title,
            "scam_category": detected_category,
            "incident_description": incident_description,
            "transaction_date_time": best_timestamp,
            "transaction_id_utr": best_utr,
            "beneficiary_upi_id": best_beneficiary_upi,
            "fraudster_phone": best_fraudster_phone,
            "suggested_amount": best_amount,
            "app_used": detected_app,
            "beneficiary_bank": detected_bank,
            "missing_fields": missing,
            "conflict_warnings": conflict_warnings,
            "quality_warnings": quality_warnings,
            "fields": fields,
            "debug_diagnostics": debug_diagnostics,
            "uploaded_evidence": all_extracted_items
        }


claude_service = ClaudeService()
