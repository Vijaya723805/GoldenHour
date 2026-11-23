import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.schemas.complaint import (
    ComplaintDocType,
    DocumentLanguage,
    GeneratedDocument,
    CaseComplaintBundle,
    UpdateComplaintDraftPayload
)
from app.services.verification_service import verification_service
from app.services.dashboard_service import dashboard_service
from app.services.auth_service import auth_service
from app.schemas.auth import UserProfile


class ComplaintService:
    def __init__(self):
        # In-memory store for generated bundles: keyed by f"{case_id}_{language}_{user_id}"
        self._bundles: Dict[str, CaseComplaintBundle] = {}

    def get_or_generate_bundle(
        self,
        case_id: str,
        language: DocumentLanguage = DocumentLanguage.EN,
        force_regenerate: bool = False,
        user: Optional[UserProfile] = None
    ) -> CaseComplaintBundle:
        """Retrieves or generates all 4 complaint documents from verified case data."""
        user_key = user.id if user else "default"
        bundle_key = f"{case_id}_{language.value}_{user_key}"

        if not force_regenerate and bundle_key in self._bundles:
            return self._bundles[bundle_key]

        # Fetch verified case parameters with dynamic user identity resolution
        case_data, verified_fields, missing_fields, overall_score = self._extract_case_parameters(case_id, user)

        # Generate each of the 4 documents in the requested language
        docs: Dict[str, GeneratedDocument] = {}

        # 1. Bank Fraud Complaint
        docs[ComplaintDocType.BANK_FRAUD_COMPLAINT.value] = self._generate_bank_complaint(
            case_data, verified_fields, missing_fields, language
        )

        # 2. Bank Account Freeze Request Draft
        docs[ComplaintDocType.BANK_FREEZE_REQUEST.value] = self._generate_freeze_request(
            case_data, verified_fields, missing_fields, language
        )

        # 3. 1930 Helpline Call Script
        docs[ComplaintDocType.HELPLINE_1930_SCRIPT.value] = self._generate_helpline_script(
            case_data, verified_fields, missing_fields, language
        )

        # 4. Cybercrime Portal Complaint Draft
        docs[ComplaintDocType.CYBERCRIME_PORTAL_DRAFT.value] = self._generate_portal_dossier(
            case_data, verified_fields, missing_fields, language
        )

        now = datetime.now()
        bundle = CaseComplaintBundle(
            case_id=case_id,
            case_number=case_data.get("case_number", f"GH-{case_id}"),
            language=language,
            documents=docs,
            missing_information_summary=missing_fields,
            overall_verified_score=overall_score,
            citizen_approved=False,
            citizen_approval_timestamp=None,
            created_at=now,
            updated_at=now
        )

        self._bundles[bundle_key] = bundle
        return bundle

    def update_document(
        self,
        case_id: str,
        doc_type: ComplaintDocType,
        payload: UpdateComplaintDraftPayload,
        language: DocumentLanguage = DocumentLanguage.EN,
        user: Optional[UserProfile] = None
    ) -> GeneratedDocument:
        """Allows citizen to edit document text and persist revisions."""
        bundle = self.get_or_generate_bundle(case_id, language, user=user)
        
        doc_key = doc_type.value
        if doc_key not in bundle.documents:
            raise ValueError(f"Document type '{doc_key}' not found in case bundle.")

        doc = bundle.documents[doc_key]
        doc.content = payload.content
        doc.is_user_edited = True
        doc.updated_at = datetime.now()
        bundle.updated_at = datetime.now()

        return doc

    def _extract_case_parameters(self, case_id: str, current_user: Optional[UserProfile] = None):
        """Pulls verified fields from verification report and dashboard case detail."""
        rep = verification_service.get_or_create_report(case_id)
        case = dashboard_service._cases.get(case_id)

        case_number = rep.case_number if rep else (case.case_number if case else f"GH-{case_id}")
        overall_score = rep.overall_score if rep else 80.0

        # Verified fields dictionary
        verified: Dict[str, Any] = {}
        if rep and rep.verified_fields:
            for f in rep.verified_fields:
                verified[f.field_key] = f.value

        # Fallbacks to case metadata
        if "transaction_id_utr" not in verified and case and case.transaction_id_utr:
            verified["transaction_id_utr"] = case.transaction_id_utr
        if "amount" not in verified and case and case.amount_lost:
            verified["amount"] = case.amount_lost
        if "beneficiary_upi_id" not in verified and case and case.beneficiary_upi_id:
            verified["beneficiary_upi_id"] = case.beneficiary_upi_id
        if "beneficiary_bank" not in verified and case and case.beneficiary_bank:
            verified["beneficiary_bank"] = case.beneficiary_bank

        # Resolve victim profile dynamically:
        victim_profile = current_user
        if not victim_profile and case and case.contact_email:
            victim_profile = auth_service.get_user_by_email(case.contact_email)
        if not victim_profile and case and case.victim_id:
            victim_profile = auth_service.get_user_by_id(case.victim_id)
        if not victim_profile:
            victim_profile = auth_service.get_primary_user()

        victim_name = victim_profile.full_name if victim_profile and victim_profile.full_name else "Citizen Complainant"
        victim_phone = (case.contact_phone if case and case.contact_phone else None) or (victim_profile.phone_number if victim_profile else None) or "+91 98765 43210"
        victim_email = (case.contact_email if case and case.contact_email else None) or (victim_profile.email if victim_profile else None) or "victim.demo@goldenhour.in"
        victim_bank = (victim_profile.bank_name if victim_profile and victim_profile.bank_name else None) or verified.get("sender_bank") or "State Bank of India (SBI)"

        # Missing fields detection
        missing: List[str] = []
        if not verified.get("transaction_id_utr"):
            missing.append("12-Digit UTR Number")
        if not verified.get("amount"):
            missing.append("Disputed Fraud Amount")
        if not verified.get("beneficiary_upi_id"):
            missing.append("Beneficiary UPI ID (VPA)")
        if not verified.get("beneficiary_bank"):
            missing.append("Beneficiary Bank Name")
        if not verified.get("beneficiary_account"):
            missing.append("Unmasked Beneficiary Bank Account Number")

        # Evidence files
        evidence_items = []
        if case and case.evidence_items:
            evidence_items = [e.file_name for e in case.evidence_items]
        elif rep and rep.verified_fields:
            for f in rep.verified_fields:
                evidence_items.extend(f.source_file_names)
            evidence_items = list(set(evidence_items))

        case_data = {
            "case_id": case_id,
            "case_number": case_number,
            "victim_name": victim_name,
            "victim_phone": victim_phone,
            "victim_email": victim_email,
            "victim_bank": victim_bank,
            "incident_date": verified.get("transaction_date") or (case.incident_date if case and case.incident_date else None) or datetime.now().strftime("%Y-%m-%d"),
            "incident_description": case.fraud_description if case else (
                "Received an urgent SMS claiming immediate power disconnection. "
                "Clicked malicious APK payment gateway link which debited unauthorized funds via UPI."
            ),
            "evidence_list": evidence_items or ["phonepe_payment_receipt_24500.png", "electricity_threat_sms.png"]
        }

        return case_data, verified, missing, overall_score

    # -------------------------------------------------------------------------
    # 1. BANK FRAUD COMPLAINT
    # -------------------------------------------------------------------------
    def _generate_bank_complaint(
        self,
        case_data: Dict[str, Any],
        verified: Dict[str, Any],
        missing: List[str],
        lang: DocumentLanguage
    ) -> GeneratedDocument:
        utr = verified.get("transaction_id_utr", "[UTR PENDING]")
        amount = verified.get("amount", 0.0)
        amount_fmt = f"INR {amount:,.2f}" if amount else "[AMOUNT PENDING]"
        vpa = verified.get("beneficiary_upi_id", "[BENEFICIARY VPA PENDING]")
        ben_bank = verified.get("beneficiary_bank", "Beneficiary Bank")
        date_str = case_data.get("incident_date", datetime.now().strftime("%Y-%m-%d"))

        if lang == DocumentLanguage.TE:
            title = "బ్యాంక్ మోసం అధికారిక వివాద ఫిర్యాదు పత్రం (Bank Fraud Dispute Letter)"
            content = (
                f"తేదీ: {datetime.now().strftime('%d/%m/%Y')}\n\n"
                f"స్వీకర్త:\n"
                f"ప్రిన్సిపల్ నోడల్ ఆఫీసర్ / ఫ్రాడ్ రిస్క్ మేనేజ్‌మెంట్ సెల్,\n"
                f"{case_data['victim_bank']},\n\n"
                f"విషయం: అనధికారిక UPI లావాదేవీపై తక్షణ ఫిర్యాదు & వివాద పరిష్కార అభ్యర్థన – UTR: {utr}\n\n"
                f"గౌరవనీయులైన సర్/మేడమ్,\n\n"
                f"నా సేవింగ్స్ ఖాతా నుండి {date_str} న నా ప్రమేయం లేకుండా అనధికారిక UPI బదిలీ జరిగిందని తెలియజేయుటకు ఈ పత్రాన్ని సమర్పిస్తున్నాను. "
                f"భారతీయ రిజర్వ్ బ్యాంక్ (RBI) సర్క్యులర్ 'RBI/2017-18/15 - అనధికారిక ఎలక్ట్రానిక్ బ్యాంకింగ్ లావాదేవీలలో కస్టమర్ లయబిలిటీ పరిమితి' ప్రకారం "
                f"నేను మోసం జరిగిన వెంటనే బ్యాంక్‌కు అధికారికంగా నివేదిస్తున్నాను కావున నా లయబిలిటీ జీరో (Zero Liability) గా పరిగణించాలి.\n\n"
                f"లావాదేవీ వివరాలు:\n"
                f"• 12 అంకెల UPI UTR సంఖ్య: {utr}\n"
                f"• వివాదాస్పద మొత్తం: {amount_fmt}\n"
                f"• లబ్ధిదారుడి UPI ID (VPA): {vpa}\n"
                f"• లబ్ధిదారుడి బ్యాంక్: {ben_bank}\n"
                f"• బాధితుడి బ్యాంక్: {case_data['victim_bank']}\n\n"
                f"ఘటన సారాంశం:\n"
                f"{case_data['incident_description']}\n\n"
                f"సమర్పించిన ఆధారాలు:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"విన్నపం / అభ్యర్థన:\n"
                f"1. ఈ వివాదాన్ని తక్షణమే మీ ఫ్రాడ్ రిస్క్ పోర్టల్‌లో నమోదు చేసి అధికారిక టికెట్/రిఫరెన్స్ నంబర్ కేటాయించండి.\n"
                f"2. లబ్ధిదారుడి బ్యాంక్ ({ben_bank}) నోడల్ విభాగాన్ని సంప్రదించి అనుమానిత నిధులపై తాత్కాలిక లీన్/హోల్డ్ విధించేలా చర్యలు తీసుకోండి.\n"
                f"3. దర్యాప్తు పూర్తయ్యే వరకు కస్టమర్ ప్రొటెక్షన్ నిబంధనల ప్రకారం నా ఖాతాకు తాత్కాలిక క్రెడిట్ అందించవలసిందిగా కోరుతున్నాను.\n\n"
                f"భవదీయుడు,\n"
                f"{case_data['victim_name']}\n"
                f"మొబైల్: {case_data['victim_phone']}"
            )
            actions = [
                "ఈ లేఖను ప్రింట్ చేసి సంతకం చేసి మీ హోమ్ బ్రాంచ్‌లో సమర్పించండి.",
                "మీ బ్యాంక్ అధికారిక కస్టమర్ కేర్ ఇమెయిల్‌కు ఈ పత్రాన్ని PDF రూపంలో పంపండి.",
                "బ్యాంక్ నుండి తప్పనిసరిగా 'సర్వీస్ రిక్వెస్ట్ (SR) నంబర్' పొందండి."
            ]
        elif lang == DocumentLanguage.HI:
            title = "बैंक धोखाधड़ी औपचारिक विवाद शिकायत पत्र (Bank Fraud Dispute Letter)"
            content = (
                f"दिनांक: {datetime.now().strftime('%d/%m/%Y')}\n\n"
                f"सेवा में,\n"
                f"प्रधान नोडल अधिकारी / फ्रॉड रिस्क मैनेजमेंट विभाग,\n"
                f"{case_data['victim_bank']},\n\n"
                f"विषय: अनधिकृत UPI लेनदेन के संबंध में तत्काल विवाद व जांच शिकायत – UTR: {utr}\n\n"
                f"महोदय/महोदया,\n\n"
                f"मैं यह औपचारिक शिकायत पत्र दिनांक {date_str} को अपने बैंक खाते से हुए अनधिकृत UPI अंतरण के संबंध में प्रस्तुत कर रहा हूँ। "
                f"भारतीय रिज़र्व बैंक (RBI) के मास्टर सर्कुलर 'RBI/2017-18/15 - अनधिकृत इलेक्ट्रॉनिक बैंकिंग लेनदेन में ग्राहकों की सीमित देयता' के अनुसार, "
                f"मैंने घटना के तत्काल भीतर बैंक को लिखित सूचना दे दी है, अतः नियमानुसार मेरी देयता शून्य (Zero Customer Liability) मानी जाए।\n\n"
                f"विवादित लेनदेन का विवरण:\n"
                f"• 12 अंकों का UPI UTR / संदर्भ संख्या: {utr}\n"
                f"• अनधिकृत कटौती राशि: {amount_fmt}\n"
                f"• प्राप्तकर्ता / जालसाज की UPI ID: {vpa}\n"
                f"• प्राप्तकर्ता बैंक: {ben_bank}\n"
                f"• प्रेषक बैंक: {case_data['victim_bank']}\n\n"
                f"घटना का विवरण:\n"
                f"{case_data['incident_description']}\n\n"
                f"संलग्न साक्ष्यों की सूची:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"प्रार्थना / आवश्यक कार्यवाही का अनुरोध:\n"
                f"1. इस अनधिकृत लेनदेन पर तत्काल औपचारिक विवाद दर्ज कर मुझे सर्विस रिक्वेस्ट (SR) नंबर जारी करें।\n"
                f"2. लाभार्थी बैंक ({ben_bank}) के नोडल अधिकारी से संपर्क कर विवादित राशि पर तत्काल प्रशासनिक लीन (Lien) लगाने की प्रक्रिया करें।\n"
                f"3. RBI के उपभोक्ता संरक्षण दिशानिर्देशों के तहत मुझे विवाद के निपटारे तक अंतरिम राहत प्रदान करें।\n\n"
                f"भवदीय,\n"
                f"{case_data['victim_name']}\n"
                f"मोबाइल: {case_data['victim_phone']}"
            )
            actions = [
                "इस पत्र का प्रिंट निकालें, हस्ताक्षर करें और अपनी बैंक शाखा में जमा करें।",
                "बैंक के नोडल अधिकारी को अपने पंजीकृत ईमेल से यह पत्र भेजें।",
                "बैंक से पावती रसीद और सर्विस रिक्वेस्ट नंबर अवश्य प्राप्त करें।"
            ]
        else:
            title = "Formal Bank Fraud Dispute Complaint Letter"
            content = (
                f"Date: {datetime.now().strftime('%d %B %Y')}\n\n"
                f"To,\n"
                f"The Principal Nodal Officer / Fraud Risk Management Team,\n"
                f"{case_data['victim_bank']},\n\n"
                f"Subject: Formal Dispute & Fraud Investigation Request for Unauthorized UPI Transaction Ref {utr}\n\n"
                f"Dear Sir/Madam,\n\n"
                f"I am writing within the Golden Hour window to report an unauthorized, fraudulent UPI transaction debited from my bank account on {date_str}. "
                f"Under the Reserve Bank of India (RBI) Circular 'RBI/2017-18/15 - Customer Protection - Limiting Liability of Customers in Unauthorised Electronic Banking Transactions', "
                f"I am entitled to ZERO LIABILITY having notified the bank immediately upon discovery of the unauthorized electronic debit.\n\n"
                f"TRANSACTION SPECIFICS:\n"
                f"• 12-Digit UPI Transaction ID / UTR: {utr}\n"
                f"• Disputed Fraud Amount: {amount_fmt}\n"
                f"• Beneficiary / Receiving UPI VPA: {vpa}\n"
                f"• Beneficiary Bank: {ben_bank}\n"
                f"• Remitter Bank: {case_data['victim_bank']}\n\n"
                f"STATEMENT OF INCIDENT:\n"
                f"{case_data['incident_description']}\n\n"
                f"DIGITAL EVIDENCE ENCLOSED:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"PRAYER / RELIEF SOUGHT:\n"
                f"1. Log this dispute on your internal Fraud Reporting System and issue a formal Dispute Ticket / Service Request Number.\n"
                f"2. Transmit an urgent stop-payment / lien requisition notice to the Beneficiary Bank ({ben_bank}) to hold the disputed funds.\n"
                f"3. Grant shadow credit / reversal as prescribed under RBI customer protection timelines.\n\n"
                f"Sincerely,\n"
                f"{case_data['victim_name']}\n"
                f"Contact: {case_data['victim_phone']} | Email: {case_data['victim_email']}"
            )
            actions = [
                "Print and sign this formal dispute letter for submission at your local branch.",
                "Email this document directly to your bank's Principal Nodal Officer.",
                "Ensure you receive a written Service Request (SR) confirmation number."
            ]

        return GeneratedDocument(
            doc_type=ComplaintDocType.BANK_FRAUD_COMPLAINT,
            title=title,
            language=lang,
            content=content,
            structured_fields={
                "victim_name": case_data["victim_name"],
                "victim_phone": case_data["victim_phone"],
                "sender_bank": case_data["victim_bank"],
                "transaction_id_utr": utr,
                "amount": amount,
                "beneficiary_upi_id": vpa,
                "beneficiary_bank": ben_bank,
                "incident_date": date_str
            },
            missing_fields=missing,
            action_items=actions,
            is_user_edited=False
        )

    # -------------------------------------------------------------------------
    # 2. BANK ACCOUNT FREEZE / LIEN REQUEST DRAFT
    # -------------------------------------------------------------------------
    def _generate_freeze_request(
        self,
        case_data: Dict[str, Any],
        verified: Dict[str, Any],
        missing: List[str],
        lang: DocumentLanguage
    ) -> GeneratedDocument:
        utr = verified.get("transaction_id_utr", "[UTR PENDING]")
        amount = verified.get("amount", 0.0)
        amount_fmt = f"INR {amount:,.2f}" if amount else "[AMOUNT PENDING]"
        vpa = verified.get("beneficiary_upi_id", "[BENEFICIARY VPA PENDING]")
        ben_bank = verified.get("beneficiary_bank", "Beneficiary Bank")
        ben_acc = verified.get("beneficiary_account", "Associated with VPA")
        date_str = case_data.get("incident_date", datetime.now().strftime("%Y-%m-%d"))

        if lang == DocumentLanguage.TE:
            title = "లబ్ధిదారుడి ఖాతా ఫ్రీజ్ / లీన్ మార్కింగ్ అభ్యర్థన పత్రం (Account Lien Request)"
            content = (
                f"తేదీ: {datetime.now().strftime('%d/%m/%Y')}\n\n"
                f"స్వీకర్త:\n"
                f"చీఫ్ విజిలెన్స్ ఆఫీసర్ & సైబర్ ఫ్రాడ్ నోడల్ డెస్క్,\n"
                f"{ben_bank},\n\n"
                f"విషయం: మోసపూరిత UPI లావాదేవీ మొత్తంపై తక్షణ 'లీన్ / డెబిట్ ఫ్రీజ్' విధించవలసిందిగా అత్యవసర విజ్ఞప్తి – UTR: {utr}\n\n"
                f"గౌరవనీయ అధికారికి,\n\n"
                f"ఈ క్రింది పేర్కొన్న మోసపూరిత UPI లావాదేవీ ద్వారా నా ఖాతా నుండి అనధికారికంగా మీ బ్యాంక్‌లో ఉన్న లబ్ధిదారుడి ఖాతాకు నిధులు బదిలీ చేయబడ్డాయి. "
                f"కేంద్ర హోం మంత్రిత్వ శాఖ (I4C) మరియు భారతీయ సైబర్ క్రైమ్ కోఆర్డినేషన్ నిబంధనల ప్రకారం, ఈ క్రింది ఖాతాపై తక్షణమే డెబిట్ ఫ్రీజ్/లీన్ మార్కింగ్ విధించాలని అభ్యర్థిస్తున్నాను:\n\n"
                f"అనుమానిత లబ్ధిదారుడి వివరాలు:\n"
                f"• లబ్ధిదారుడి UPI ID (VPA): {vpa}\n"
                f"• లబ్ధిదారుడి ఖాతా నంబర్ (లభ్యమైతే): {ben_acc}\n"
                f"• లబ్ధిదారుడి బ్యాంక్: {ben_bank}\n"
                f"• వివాదాస్పద లావాదేవీ మొత్తం: {amount_fmt}\n"
                f"• 12 అంకెల UPI UTR సంఖ్య: {utr}\n"
                f"• బదిలీ తేదీ: {date_str}\n\n"
                f"చట్టబద్ధమైన స్పష్టీకరణ:\n"
                f"ఖాతాను పూర్తిగా ఫ్రీజ్ చేయడం లేదా లీన్ మార్కింగ్ చేయడం అనేది కేవలం మీ బ్యాంక్ మరియు దర్యాప్తు సంస్థల నిర్ణయంపై ఆధారపడి ఉంటుంది. "
                f"ఈ అభ్యర్థన నేరారోపణ రుజువుగా కాక, బాధితుడి నిధులు ఉపసంహరించబడకుండా ఆపడానికి తక్షణ చర్యగా సమర్పిస్తున్నాను.\n\n"
                f"భవదీయుడు,\n"
                f"{case_data['victim_name']}\n"
                f"మొబైల్: {case_data['victim_phone']}"
            )
            actions = [
                "ఈ లేఖను లబ్ధిదారుడి బ్యాంక్ నోడల్ అధికారి ఇమెయిల్‌కు పంపండి.",
                "మీ బ్యాంక్ ఫ్రాడ్ డెస్క్ ద్వారా లబ్ధిదారుడి బ్యాంక్‌కు అంతర్గత మెసేజ్ పంపించమని కోరండి.",
                "1930 కాల్ సమయంలో ఆపరేటర్‌కు లబ్ధిదారుడి బ్యాంక్ వివరాలు తెలపండి."
            ]
        elif lang == DocumentLanguage.HI:
            title = "प्राप्तकर्ता बैंक खाता फ्रीज / लीन अनुरोध पत्र (Account Lien Request)"
            content = (
                f"दिनांक: {datetime.now().strftime('%d/%m/%Y')}\n\n"
                f"सेवा में,\n"
                f"मुख्य सतर्कता अधिकारी / साइबर फ्रॉड नोडल सेल,\n"
                f"{ben_bank},\n\n"
                f"विषय: अनधिकृत UPI धोखाधड़ी राशि पर तत्काल 'डेबिट लीन / फ्रीज' का अनुरोध – UTR: {utr}\n\n"
                f"महोदय/महोदया,\n\n"
                f"मैं यह तत्काल अनुरोध पत्र दिनांक {date_str} को हुए साइबर फ्रॉड के संबंध में प्रस्तुत कर रहा हूँ। "
                f"मेरे बैंक खाते से अनधिकृत रूप से धनराशि आपके बैंक में स्थित संदेहास्पद खाते/VPA में अंतरित हुई है। "
                f"गृह मंत्रालय (I4C) साइबर क्राइम प्रोटोकॉल के तहत, जालसाज द्वारा पैसे की निकासी रोकने हेतु निम्नलिखित खाते पर तत्काल प्रशासनिक रोक (Lien Marking) लगाने का अनुरोध है:\n\n"
                f"संदेहास्पद लाभार्थी का विवरण:\n"
                f"• लाभार्थी की UPI ID (VPA): {vpa}\n"
                f"• लाभार्थी खाता संख्या (यदि उपलब्ध हो): {ben_acc}\n"
                f"• लाभार्थी बैंक: {ben_bank}\n"
                f"• अनधिकृत कटौती राशि: {amount_fmt}\n"
                f"• 12 अंकों का UPI UTR: {utr}\n"
                f"• लेनदेन की तिथि: {date_str}\n\n"
                f"महत्वपूर्ण विधिक सूचना:\n"
                f"खाते पर लीन या फ्रीज लगाने का अधिकार पूर्णतः बैंक और संबंधित पुलिस प्रशासन के वैधानिक अधिकार क्षेत्र में है। "
                f"यह दस्तावेज गोल्डन आवर के दौरान त्वरित प्रशासनिक संज्ञान हेतु एक आधिकारिक अनुरोध पत्र है।\n\n"
                f"भवदीय,\n"
                f"{case_data['victim_name']}\n"
                f"मोबाइल: {case_data['victim_phone']}"
            )
            actions = [
                "यह पत्र प्राप्तकर्ता बैंक के नोडल अधिकारी को ईमेल द्वारा भेजें।",
                "अपने बैंक से कहें कि वे प्राप्तकर्ता बैंक को बैंकिंग नेटवर्क पर त्वरित संदेश भेजें।",
                "1930 कॉल के दौरान ऑपरेटर को प्राप्तकर्ता बैंक का नाम अवश्य नोट कराएं।"
            ]
        else:
            title = "Urgent Bank Account Lien / Debit Freeze Requisition Draft"
            content = (
                f"Date: {datetime.now().strftime('%d %B %Y')}\n\n"
                f"To,\n"
                f"The Chief Vigilance Officer / Cyber Fraud Nodal Officer,\n"
                f"{ben_bank},\n\n"
                f"Subject: Urgent Requisition to Place Administrative Lien / Debit Freeze on Fraudulent Recipient – UTR: {utr}\n\n"
                f"Dear Sir/Madam,\n\n"
                f"I am writing within the Golden Hour window to register an emergency dispute concerning an unauthorized UPI fund diversion. "
                f"A fraudulent transfer siphoned funds from my account directly to a beneficiary handle maintained at your institution. "
                f"In alignment with Ministry of Home Affairs (I4C) Citizen Financial Cyber Fraud SOPs, I respectfully request your Fraud Risk Cell "
                f"to review the suspicious transaction and place an immediate administrative debit hold / lien marking on the beneficiary account.\n\n"
                f"SUSPECTED BENEFICIARY SPECIFICS:\n"
                f"• Beneficiary UPI VPA: {vpa}\n"
                f"• Beneficiary Account (if visible): {ben_acc}\n"
                f"• Receiving Bank: {ben_bank}\n"
                f"• Disputed Fraud Amount: {amount_fmt}\n"
                f"• 12-Digit UPI Transaction ID / UTR: {utr}\n"
                f"• Transfer Date & Timeline: {date_str} (Golden Hour Reported)\n\n"
                f"MANDATORY LEGAL DISCLAIMER:\n"
                f"The legal decision and statutory authority to freeze, restrict, or lien any bank account resides solely with the receiving bank "
                f"or law enforcement authority under Section 102 CrPC / BNSS. This requisition serves as an urgent victim notice to safeguard disputed funds.\n\n"
                f"Respectfully submitted,\n"
                f"{case_data['victim_name']}\n"
                f"Contact: {case_data['victim_phone']} | Email: {case_data['victim_email']}"
            )
            actions = [
                "Email this requisition to the Beneficiary Bank's Fraud Desk and Nodal Officer.",
                "Instruct your home bank to issue an inter-bank alert via the NPCI portal.",
                "Quote the receiving bank's IFSC/code during your 1930 telephone intake."
            ]

        return GeneratedDocument(
            doc_type=ComplaintDocType.BANK_FREEZE_REQUEST,
            title=title,
            language=lang,
            content=content,
            structured_fields={
                "beneficiary_upi_id": vpa,
                "beneficiary_account": ben_acc,
                "beneficiary_bank": ben_bank,
                "transaction_id_utr": utr,
                "amount": amount,
                "incident_date": date_str
            },
            missing_fields=missing,
            action_items=actions,
            is_user_edited=False
        )

    # -------------------------------------------------------------------------
    # 3. 1930 HELPLINE CALL SCRIPT
    # -------------------------------------------------------------------------
    def _generate_helpline_script(
        self,
        case_data: Dict[str, Any],
        verified: Dict[str, Any],
        missing: List[str],
        lang: DocumentLanguage
    ) -> GeneratedDocument:
        utr = verified.get("transaction_id_utr", "[12-DIGIT UTR PENDING]")
        amount = verified.get("amount", 0.0)
        amount_fmt = f"INR {amount:,.2f}" if amount else "[AMOUNT PENDING]"
        vpa = verified.get("beneficiary_upi_id", "[BENEFICIARY VPA]")
        ben_bank = verified.get("beneficiary_bank", "Beneficiary Bank")
        date_str = case_data.get("incident_date", datetime.now().strftime("%Y-%m-%d"))

        # Format UTR with spaced digits for easy verbal reading
        utr_spaced = " ".join(list(str(utr))) if utr != "[12-DIGIT UTR PENDING]" else utr

        if lang == DocumentLanguage.TE:
            title = "1930 జాతీయ సైబర్ హెల్ప్‌లైన్ సంభాషణ స్క్రిప్ట్ (1930 Call Script)"
            content = (
                f"📞 1930 ఆపరేటర్‌తో మాట్లాడే విధానం (కాల్ స్క్రిప్ట్):\n\n"
                f"ఆపరేటర్ నమస్కారం చెప్పినప్పుడు మీరు చెప్పవలసిన మాటలు:\n\n"
                f"\"నమస్కారం సార్/మేడమ్, నా బ్యాంక్ ఖాతా నుండి కొద్దిసేపటి క్రితం ఒక అనధికారిక UPI మోసం జరిగింది. "
                f"నేను గోల్డెన్ అవర్ లో ఉన్నాను. దయచేసి తక్షణమే ఎన్‌సిఆర్‌పి (NCRP) పోర్టల్‌లో ఈ లావాదేవీని నమోదు చేసి మోసగాడి ఖాతాపై లీన్ పెట్టండి.\"\n\n"
                f"ఆపరేటర్ అడిగే సమాధానాలు (వెరిఫైడ్ వివరాలు చదవండి):\n"
                f"1. నా 12 అంకెల UPI UTR సంఖ్య: {utr_spaced}\n"
                f"2. డెబిట్ అయిన మొత్తం: {amount_fmt}\n"
                f"3. నా బ్యాంక్ పేరు: {case_data['victim_bank']}\n"
                f"4. మోసగాడి UPI ID (VPA): {vpa}\n"
                f"5. మోసగాడి బ్యాంక్: {ben_bank}\n"
                f"6. లావాదేవీ సమయం/తేదీ: {date_str}\n\n"
                f"కాల్ చివరలో తప్పక అడగవలసిన ప్రశ్న:\n"
                f"\"సార్, నా రిఫరెన్స్ టోకెన్ లేదా అక్నాలెడ్జ్‌మెంట్ SMS ఎప్పుడు వస్తుంది? దయచేసి టికెట్ నంబర్ చెప్పండి.\""
            )
            actions = [
                "1930 నంబర్‌కు డయల్ చేయడానికి ముందు ఈ పేజీని మీ ముందు ఉంచుకోండి.",
                "12 అంకెల UTR నంబర్‌ను ఆపరేటర్‌కు నిదానంగా స్పష్టంగా చదివి వినిపించండి.",
                "కాల్ పూర్తయ్యాక వచ్చే SMS టోకెన్‌ను జాగ్రత్తగా రాసి పెట్టుకోండి."
            ]
        elif lang == DocumentLanguage.HI:
            title = "1930 राष्ट्रीय साइबर हेल्पलाइन ऑपरेटर कॉल स्क्रिप्ट (1930 Call Script)"
            content = (
                f"📞 1930 ऑपरेटर से बात करते समय बोलने के लिए तैयार स्क्रिप्ट:\n\n"
                f"कॉल शुरू होते ही ऑपरेटर को स्पष्ट रूप से यह कहें:\n\n"
                f"\"नमस्ते, मेरे खाते से अभी-अभी एक अनधिकृत UPI लेनदेन हुआ है। "
                f"मैं अभी 'गोल्डन ऑवर' के भीतर रिपोर्ट कर रहा हूँ। कृपया तुरंत इस लेनदेन का संज्ञान लेकर प्राप्तकर्ता बैंक में राशि पर लीन (Lien) लगाएं।\"\n\n"
                f"ऑपरेटर द्वारा पूछे जाने वाले आवश्यक विवरण (स्पष्ट स्वर में बोलें):\n"
                f"1. 12 अंकों का UPI UTR नंबर: {utr_spaced}\n"
                f"2. कटी हुई राशि: {amount_fmt}\n"
                f"3. मेरे बैंक का नाम: {case_data['victim_bank']}\n"
                f"4. जालसाज की UPI ID (VPA): {vpa}\n"
                f"5. जालसाज का बैंक: {ben_bank}\n"
                f"6. लेनदेन की तिथि: {date_str}\n\n"
                f"कॉल समाप्त करने से पूर्व अनिवार्य प्रश्न:\n"
                f"\"कृपया मेरी शिकायत का NCRP पावती टोकन नंबर नोट कराएं, ताकि मैं cybercrime.gov.in पर अंतिम विवरण दर्ज कर सकूँ।\""
            )
            actions = [
                "1930 डायल करने से पहले इस स्क्रिप्ट को अपने सामने रखें।",
                "12 अंकों के UTR को एक-एक अंक करके ऑपरेटर को स्पष्ट बताएं।",
                "SMS में प्राप्त शिकायत संदर्भ टोकन को सुरक्षित नोट करें।"
            ]
        else:
            title = "1930 National Cybercrime Helpline Speaking Script"
            content = (
                f"📞 SPOKEN SCRIPT FOR 1930 OPERATOR INTAKE:\n\n"
                f"When the operator answers, state calmly and clearly:\n\n"
                f"\"Hello, I am reporting an unauthorized fraudulent UPI debit within the Golden Hour window. "
                f"I need to immediately record the transaction reference on the CFCFRMS system to alert the receiving bank to mark a lien.\"\n\n"
                f"KEY VERIFIED PARAMETERS TO COMMUNICATE (READ SLOWLY):\n"
                f"1. 12-Digit UPI Transaction UTR: {utr_spaced}\n"
                f"2. Exact Disputed Amount: {amount_fmt}\n"
                f"3. My Issuing Bank: {case_data['victim_bank']}\n"
                f"4. Fraudster's Receiving UPI VPA: {vpa}\n"
                f"5. Receiving Bank Name: {ben_bank}\n"
                f"6. Incident Timestamp: {date_str}\n\n"
                f"CRITICAL CLOSING QUESTION TO THE OPERATOR:\n"
                f"\"Please confirm my NCRP Acknowledgement Token number so that I can track and complete filing on cybercrime.gov.in.\""
            )
            actions = [
                "Have your bank debit SMS open alongside this script.",
                "Read the 12-digit UTR digit-by-digit for operator accuracy.",
                "Immediately write down the SMS acknowledgement token."
            ]

        return GeneratedDocument(
            doc_type=ComplaintDocType.HELPLINE_1930_SCRIPT,
            title=title,
            language=lang,
            content=content,
            structured_fields={
                "transaction_id_utr": utr,
                "amount": amount,
                "sender_bank": case_data["victim_bank"],
                "beneficiary_upi_id": vpa,
                "beneficiary_bank": ben_bank,
                "incident_date": date_str
            },
            missing_fields=missing,
            action_items=actions,
            is_user_edited=False
        )

    # -------------------------------------------------------------------------
    # 4. CYBERCRIME PORTAL COMPLAINT DRAFT (cybercrime.gov.in)
    # -------------------------------------------------------------------------
    def _generate_portal_dossier(
        self,
        case_data: Dict[str, Any],
        verified: Dict[str, Any],
        missing: List[str],
        lang: DocumentLanguage
    ) -> GeneratedDocument:
        utr = verified.get("transaction_id_utr", "[UTR PENDING]")
        amount = verified.get("amount", 0.0)
        amount_fmt = f"INR {amount:,.2f}" if amount else "[AMOUNT PENDING]"
        vpa = verified.get("beneficiary_upi_id", "[BENEFICIARY VPA PENDING]")
        ben_bank = verified.get("beneficiary_bank", "Beneficiary Bank")
        date_str = case_data.get("incident_date", datetime.now().strftime("%Y-%m-%d"))

        if lang == DocumentLanguage.TE:
            title = "జాతీయ సైబర్ క్రైమ్ పోర్టల్ (cybercrime.gov.in) ఫిర్యాదు డ్రాఫ్ట్"
            content = (
                f"భారత ప్రభుత్వ జాతీయ సైబర్ క్రైమ్ రిపోర్టింగ్ పోర్టల్ (NCRP) ఫారమ్ వివరాలు:\n\n"
                f"పోర్టల్ విభాగాలు & పూరించవలసిన వివరాలు:\n\n"
                f"1. కేటగిరీ: ఫైనాన్షియల్ ఫ్రాడ్ (Financial Fraud) -> UPI సంబంధిత మోసం (UPI Related Fraud)\n\n"
                f"2. బాధితుడి వివరాలు (Victim Particulars):\n"
                f"• పూర్తి పేరు: {case_data['victim_name']}\n"
                f"• మొబైల్ నంబర్: {case_data['victim_phone']}\n"
                f"• ఇమెయిల్: {case_data['victim_email']}\n"
                f"• బాధితుడి బ్యాంక్: {case_data['victim_bank']}\n\n"
                f"3. లావాదేవీ వివరాలు (Transaction Details):\n"
                f"• లావాదేవీ విధానం: UPI (Unified Payments Interface)\n"
                f"• 12 అంకెల UTR సంఖ్య: {utr}\n"
                f"• బదిలీ అయిన మొత్తం: {amount_fmt}\n"
                f"• లబ్ధిదారుడి UPI ID: {vpa}\n"
                f"• లబ్ధిదారుడి బ్యాంక్: {ben_bank}\n"
                f"• ఘటన తేదీ: {date_str}\n\n"
                f"4. ఘటన పూర్తి వివరణ (Incident Description - పోర్టల్‌లో కాపీ చేయండి):\n"
                f"{case_data['incident_description']}\n\n"
                f"5. అప్‌లోడ్ చేయవలసిన ఆధారాలు:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"డిక్లరేషన్:\n"
                f"ఈ వివరాలు నిజమైనవని నేను ధృవీకరిస్తున్నాను. GoldenHour AI ఆటోమేటిక్‌గా పోలీసులకు ఫిర్యాదు చేయదు; నేనే స్వయంగా పోర్టల్‌లో నమోదు చేస్తున్నాను."
            )
            actions = [
                "https://cybercrime.gov.in వెబ్‌సైట్‌కి వెళ్ళండి.",
                "'Report Financial Fraud' పై క్లిక్ చేసి పై టెక్స్ట్‌ను పేస్ట్ చేయండి.",
                "మీ ఆధారాల స్క్రీన్‌షాట్‌లను అటాచ్ చేసి ఫిర్యాదు సబ్మిట్ చేయండి."
            ]
        elif lang == DocumentLanguage.HI:
            title = "राष्ट्रीय साइबर अपराध पोर्टल (cybercrime.gov.in) शिकायत प्रारूप"
            content = (
                f"गृह मंत्रालय राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल (NCRP) हेतु संरचित शिकायत:\n\n"
                f"पोर्टल के अनुसार आवश्यक फील्ड व विवरण:\n\n"
                f"1. अपराध श्रेणी: वित्तीय धोखाधड़ी (Financial Fraud) -> UPI संबंधी धोखाधड़ी (UPI Related Fraud)\n\n"
                f"2. शिकायतकर्ता का विवरण (Complainant Details):\n"
                f"• पूरा नाम: {case_data['victim_name']}\n"
                f"• मोबाइल नंबर: {case_data['victim_phone']}\n"
                f"• ईमेल आईडी: {case_data['victim_email']}\n"
                f"• पीड़ित का बैंक: {case_data['victim_bank']}\n\n"
                f"3. लेनदेन का विवरण (Transaction Particulars):\n"
                f"• भुगतान माध्यम: UPI\n"
                f"• 12 अंकों का UTR नंबर: {utr}\n"
                f"• कटी हुई राशि: {amount_fmt}\n"
                f"• संदिग्ध की UPI ID: {vpa}\n"
                f"• संदिग्ध का बैंक: {ben_bank}\n"
                f"• घटना की तिथि: {date_str}\n\n"
                f"4. घटना का विवरण (Incident Narrative - पोर्टल में पेस्ट करें):\n"
                f"{case_data['incident_description']}\n\n"
                f"5. संलग्न साक्ष्य फाइलें:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"घोषणा:\n"
                f"मैं प्रमाणित करता हूँ कि उपरोक्त सभी साक्ष्य सत्य हैं। GoldenHour स्वचालित रूप से शिकायत दर्ज नहीं करता; यह प्रारूप केवल आधिकारिक पोर्टल पर स्वयं दर्ज करने के लिए है।"
            )
            actions = [
                "आधिकारिक पोर्टल https://cybercrime.gov.in पर जाएं।",
                "'Report Financial Fraud' विकल्प चुनकर इस विवरण को फॉर्म में पेस्ट करें।",
                "स्क्रीनशॉट अटैच कर शिकायत दर्ज करें और पावती रसीद डाउनलोड करें।"
            ]
        else:
            title = "National Cyber Crime Reporting Portal (cybercrime.gov.in) Complaint Dossier"
            content = (
                f"FORMAL COMPLAINT DOSSIER FOR NATIONAL CYBER CRIME REPORTING PORTAL (NCRP):\n\n"
                f"1. COMPLAINT CLASSIFICATION:\n"
                f"Category: Financial Fraud -> UPI Related Fraud / Phishing\n\n"
                f"2. COMPLAINANT PARTICULARS:\n"
                f"• Full Name: {case_data['victim_name']}\n"
                f"• Mobile Number: {case_data['victim_phone']}\n"
                f"• Email: {case_data['victim_email']}\n"
                f"• Remitter Bank: {case_data['victim_bank']}\n\n"
                f"3. DISPUTED TRANSACTION PARTICULARS:\n"
                f"• Payment Channel: UPI (Unified Payments Interface)\n"
                f"• 12-Digit Reference / UTR Number: {utr}\n"
                f"• Total Disputed Loss: {amount_fmt}\n"
                f"• Suspect Beneficiary VPA: {vpa}\n"
                f"• Suspect Beneficiary Bank: {ben_bank}\n"
                f"• Incident Date: {date_str}\n\n"
                f"4. INCIDENT NARRATIVE (COPY-PASTE READY FOR PORTAL):\n"
                f"{case_data['incident_description']}\n\n"
                f"5. EVIDENCE ATTACHMENT INDEX:\n"
                + "\n".join([f"• {ev}" for ev in case_data['evidence_list']]) + "\n\n"
                f"LEGAL ATTESTATION:\n"
                f"I attest that the information provided is accurate to the best of my knowledge. "
                f"GoldenHour provides this draft to assist self-filing and does not automatically submit complaints to law enforcement."
            )
            actions = [
                "Visit the official portal at https://cybercrime.gov.in.",
                "Click on 'Report Financial Fraud' and populate the form using this dossier.",
                "Attach the screenshot evidence files and record your formal acknowledgement number."
            ]

        return GeneratedDocument(
            doc_type=ComplaintDocType.CYBERCRIME_PORTAL_DRAFT,
            title=title,
            language=lang,
            content=content,
            structured_fields={
                "victim_name": case_data["victim_name"],
                "victim_phone": case_data["victim_phone"],
                "victim_email": case_data["victim_email"],
                "sender_bank": case_data["victim_bank"],
                "transaction_id_utr": utr,
                "amount": amount,
                "beneficiary_upi_id": vpa,
                "beneficiary_bank": ben_bank,
                "incident_date": date_str
            },
            missing_fields=missing,
            action_items=actions,
            is_user_edited=False
        )


complaint_service = ComplaintService()
