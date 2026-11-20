import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.config import settings
from app.core.security import redact_sensitive_text, contains_sensitive_credentials
from app.schemas.assistant import (
    AssistantLanguage,
    AssistantTopic,
    ChatRequest,
    ChatResponse,
    QuickAction
)
from app.services.dashboard_service import dashboard_service
from app.services.verification_service import verification_service

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class AssistantService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.client = None
        if ANTHROPIC_AVAILABLE and self.api_key and "your-claude" not in self.api_key:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception:
                self.client = None

    def detect_topic(self, text: str) -> AssistantTopic:
        """Determines the core intent/topic of the citizen's inquiry."""
        t = text.lower()

        # Helpline 1930
        if any(w in t for w in ["1930", "helpline", "call", "phone", "number", "నంబర్", "కాల్", "नंबर", "कॉल"]):
            return AssistantTopic.HELPLINE_1930

        # Official portal
        if any(w in t for w in ["portal", "cybercrime.gov.in", "website", "online", "పోర్టల్", "వెబ్‌సైట్", "पोर्टल", "वेबसाइट"]):
            return AssistantTopic.CYBERCRIME_PORTAL

        # Evidence preservation
        if any(w in t for w in ["evidence", "proof", "screenshot", "save", "preserve", "ఆధారాలు", "స్క్రీన్‌షాట్", "భద్రపరచాలి", "सबूत", "स्क्रीनशॉट", "प्रमाण"]):
            return AssistantTopic.EVIDENCE_PRESERVATION

        # Difference between reporting and freezing
        if any(w in t for w in ["freeze", "lien", "difference", "hold", "ఫ్రీజ్", "తేడా", "హోల్డ్", "फ्रीज", "अंतर", "होल्ड"]):
            return AssistantTopic.BANK_DISPUTE_VS_FREEZE

        # Senior citizen instructions
        if any(w in t for w in ["senior", "elderly", "old", "simple", "easy", "తల్లిదండ్రులు", "వృద్ధులు", "సులభం", "बुजुर्ग", "वरिष्ठ", "सरल"]):
            return AssistantTopic.SENIOR_CITIZEN_GUIDANCE

        # Bank dispute or RBI zero liability
        if any(w in t for w in ["bank", "dispute", "rbi", "liability", "refund", "బ్యాంక్", "వివాదం", "బాధ్యత", "बैंक", "विवाद", "रिफंड"]):
            return AssistantTopic.RBI_ZERO_LIABILITY

        return AssistantTopic.GENERAL

    def get_case_context(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves verified transaction parameters for context-aware assistance."""
        if not case_id:
            return None

        # Try verification service report first (highest accuracy)
        rep = verification_service.get_or_create_report(case_id)
        if rep:
            ctx: Dict[str, Any] = {
                "case_number": rep.case_number,
                "overall_score": rep.overall_score,
                "verified_fields": {f.field_key: f.value for f in rep.verified_fields}
            }
            return ctx

        # Fallback to dashboard case detail
        case = dashboard_service._cases.get(case_id)
        if case:
            return {
                "case_number": case.case_number,
                "amount": case.amount_lost,
                "utr": case.transaction_id_utr,
                "beneficiary_upi": case.beneficiary_upi_id,
                "beneficiary_bank": case.beneficiary_bank
            }
        return None

    def process_chat(self, req: ChatRequest) -> ChatResponse:
        """
        Processes citizen's message through multilingual safety filters,
        context injection, and generates authoritative official guidance.
        """
        # Step 1: Strict Zero-Credential Sanitization
        raw_message = req.message
        sanitized_message = redact_sensitive_text(raw_message)
        has_credentials, violations = contains_sensitive_credentials(raw_message)

        # Step 2: Retrieve case context if authorized by citizen
        case_context = None
        if req.use_case_context and req.case_id:
            case_context = self.get_case_context(req.case_id)

        # Step 3: Detect topic
        topic = self.detect_topic(sanitized_message)

        # Step 4: Handle dangerous credential input immediately
        if has_credentials:
            warning_reply = self._generate_credential_warning(req.language)
            return ChatResponse(
                reply=warning_reply,
                language=req.language,
                detected_topic=AssistantTopic.GENERAL,
                suggested_quick_actions=[
                    QuickAction(label="Emergency 1930", action_type="CALL", action_target="tel:1930"),
                    QuickAction(label="Official Portal", action_type="NAVIGATE", action_target="https://cybercrime.gov.in")
                ],
                follow_up_questions=self._get_follow_ups(topic, req.language),
                senior_citizen_mode=req.senior_citizen_mode,
                zero_credential_sanitized=True,
                context_used=None
            )

        # Step 5: Try Claude API if configured
        if self.client:
            try:
                ai_reply = self._call_claude(
                    message=sanitized_message,
                    language=req.language,
                    topic=topic,
                    case_context=case_context,
                    senior_mode=req.senior_citizen_mode,
                    history=req.conversation_history
                )
                if ai_reply:
                    return ChatResponse(
                        reply=ai_reply,
                        language=req.language,
                        detected_topic=topic,
                        suggested_quick_actions=self._get_quick_actions(topic, req.language),
                        follow_up_questions=self._get_follow_ups(topic, req.language),
                        senior_citizen_mode=req.senior_citizen_mode,
                        zero_credential_sanitized=True,
                        context_used=case_context
                    )
            except Exception:
                pass  # Fall back gracefully to built-in knowledge engine

        # Step 6: Robust Multilingual Knowledge Engine (English, Telugu, Hindi)
        reply = self._generate_knowledge_reply(
            message=sanitized_message,
            language=req.language,
            topic=topic,
            case_context=case_context,
            senior_mode=req.senior_citizen_mode
        )

        return ChatResponse(
            reply=reply,
            language=req.language,
            detected_topic=topic,
            suggested_quick_actions=self._get_quick_actions(topic, req.language),
            follow_up_questions=self._get_follow_ups(topic, req.language),
            senior_citizen_mode=req.senior_citizen_mode,
            zero_credential_sanitized=True,
            context_used=case_context
        )

    # -------------------------------------------------------------------------
    # Knowledge Engine Generators (English, Telugu, Hindi)
    # -------------------------------------------------------------------------
    def _generate_credential_warning(self, lang: AssistantLanguage) -> str:
        if lang == AssistantLanguage.TE:
            return (
                "⚠️ అత్యవసర హెచ్చరిక: మీరు నమోదు చేసిన సందేశంలో రహస్య UPI PIN లేదా OTP గుర్తించబడింది మరియు గోల్డెన్‌అవర్ ద్వారా భద్రత కోసం తొలగించబడింది.\n\n"
                "ముఖ్య సూచన: మీ UPI PIN, MPIN, లేదా OTPని ఎవరికీ (బ్యాంక్ అధికారులు, సైబర్ పోలీసులు లేదా ఏ యాప్‌లోనూ) ఎప్పుడూ చెప్పవద్దు. "
                "డబ్బులు ఖాతాలోకి రావడానికి PIN ఎప్పుడూ అవసరం లేదు."
            )
        elif lang == AssistantLanguage.HI:
            return (
                "⚠️ अत्यंत महत्वपूर्ण सुरक्षा चेतावनी: आपके संदेश में UPI पिन या OTP जैसा गोपनीय विवरण मिला है, जिसे सुरक्षा के लिए तुरंत हटा (Redact) दिया गया है।\n\n"
                "कृपया ध्यान दें: अपना UPI पिन, MPIN या बैंक OTP कभी भी किसी के साथ साझा न करें — न ही बैंक कर्मचारी, न पुलिस और न ही किसी ऐप पर। "
                "पैसे प्राप्त करने के लिए कभी भी पिन दर्ज करने की आवश्यकता नहीं होती है।"
            )
        else:
            return (
                "⚠️ CRITICAL SECURITY WARNING: Your message contained numbers resembling a secret UPI PIN or OTP. "
                "GoldenHour has automatically redacted this information to protect your security.\n\n"
                "RULE OF THUMB: Never share your UPI PIN, MPIN, or OTP with anyone — including bank officials, customer support, or police. "
                "You NEVER need to enter your PIN to receive money."
            )

    def _generate_knowledge_reply(
        self,
        message: str,
        language: AssistantLanguage,
        topic: AssistantTopic,
        case_context: Optional[Dict[str, Any]],
        senior_mode: bool
    ) -> str:
        """Constructs accurate, officially aligned responses across languages and topics."""
        # Extract case context variables if available
        utr_str = ""
        amount_str = ""
        vpa_str = ""
        bank_str = ""
        if case_context:
            vf = case_context.get("verified_fields", {})
            utr_str = vf.get("transaction_id_utr") or case_context.get("utr") or ""
            amt = vf.get("amount") or case_context.get("amount")
            amount_str = f"₹{amt:,.2f}" if amt else ""
            vpa_str = vf.get("beneficiary_upi_id") or case_context.get("beneficiary_upi") or ""
            bank_str = vf.get("beneficiary_bank") or case_context.get("beneficiary_bank") or ""

        # =====================================================================
        # 1. HELPLINE 1930 GUIDANCE
        # =====================================================================
        if topic == AssistantTopic.HELPLINE_1930:
            if language == AssistantLanguage.TE:
                ctx_info = f"\n\nమీ వెరిఫైడ్ కేసు వివరాలు: UTR సంఖ్య '{utr_str}', మొత్తం '{amount_str}' మరియు మోసగాడి UPI '{vpa_str}' ని ఆపరేటర్‌కు నేరుగా చెప్పండి." if utr_str else ""
                if senior_mode:
                    return (
                        "📞 1930 సైబర్ హెల్ప్‌లైన్ – సీనియర్ సిటిజన్ సులభ మార్గదర్శి:\n\n"
                        "1. మీ ఫోన్ నుండి వెంటనే 1930 నంబర్‌కు డయల్ చేయండి (ఇది భారత ప్రభుత్వ ఉచిత సైబర్ హెల్ప్‌లైన్).\n"
                        "2. మొదటి 2 నుండి 3 గంటల 'గోల్డెన్ అవర్' లో కాల్ చేయడం చాలా ముఖ్యం.\n"
                        "3. ఆపరేటర్ మీ బ్యాంక్ పేరు మరియు 12 అంకెల UTR నంబర్ అడుగుతారు.\n"
                        "4. కాల్ ముగిసిన తర్వాత మీ ఫోన్‌కు ఒక NCRP అక్నాలెడ్జ్‌మెంట్ SMS వస్తుంది, దాన్ని భద్రపరచండి.\n"
                        "5. వీలైతే మీ కుటుంబ సభ్యుడిని మీ పక్కన ఉంచుకోండి." + ctx_info
                    )
                return (
                    "📞 1930 నేషనల్ సైబర్ ఫైనాన్షియల్ ఫ్రాడ్ హెల్ప్‌లైన్ విధానం:\n\n"
                    "• 'గోల్డెన్ అవర్' వ్యవధి: మోసం జరిగిన మొదటి 2-3 గంటలలో 1930 కి కాల్ చేస్తే, కేంద్ర ప్రభుత్వ I4C వ్యవస్థ ద్వారా నిధులు మోసగాడి ఖాతా నుండి బయటకు వెళ్లకుండా తాత్కాలిక 'లీన్/హోల్డ్' అభ్యర్థన పంపబడుతుంది.\n"
                    "• అవసరమైన వివరాలు:\n"
                    "  1. లావాదేవీకి సంబంధించిన 12 అంకెల UPI UTR సంఖ్య.\n"
                    "  2. డెబిట్ అయిన ఖచ్చితమైన తేదీ మరియు సమయం.\n"
                    "  3. మీ బ్యాంక్ పేరు మరియు ఖాతా నంబర్.\n"
                    "  4. లబ్ధిదారుడి UPI ID (VPA).\n"
                    "• రసీదు సంఖ్య: కాల్ ముగిసిన వెంటనే మీ మొబైల్‌కు NCRP కంప్లైంట్ రిఫరెన్స్ టోకెన్ వస్తుంది. దీని ద్వారా cybercrime.gov.in లో 24 గంటల్లో పూర్తి ఫిర్యాదును సమర్పించాలి." + ctx_info
                )

            elif language == AssistantLanguage.HI:
                ctx_info = f"\n\nआपके सत्यापित केस की जानकारी: ऑपरेटर को UTR संख्या '{utr_str}', राशि '{amount_str}' और प्राप्तकर्ता UPI '{vpa_str}' स्पष्ट रूप से बताएं।" if utr_str else ""
                if senior_mode:
                    return (
                        "📞 1930 साइबर हेल्पलाइन – वरिष्ठ नागरिकों के लिए आसान निर्देश:\n\n"
                        "1. तुरंत अपने फोन से 1930 नंबर डायल करें (यह भारत सरकार की निशुल्क साइबर हेल्पलाइन है)।\n"
                        "2. धोखाधड़ी के पहले 2-3 घंटे ('गोल्डन ऑवर') में कॉल करना सबसे महत्वपूर्ण है।\n"
                        "3. ऑपरेटर आपसे आपके बैंक का नाम और 12 अंकों का UTR नंबर पूछेगा।\n"
                        "4. कॉल समाप्त होने पर आपके मोबाइल पर एक पावती SMS (Acknowledgment Token) आएगा, उसे संभाल कर रखें।\n"
                        "5. शांत रहें और संभव हो तो परिवार के किसी सदस्य को अपने साथ रखें।" + ctx_info
                    )
                return (
                    "📞 1930 राष्ट्रीय साइबर वित्तीय धोखाधड़ी हेल्पलाइन प्रक्रिया:\n\n"
                    "• 'गोल्डन ऑवर' का महत्व: अनधिकृत UPI लेनदेन के पहले 2-3 घंटों के भीतर 1930 पर कॉल करने पर, गृह मंत्रालय का I4C नेटवर्क संबंधित बैंकों को तत्काल डेबिट फ्रीज/लीन लगाने का निर्देश भेजता है।\n"
                    "• कॉल करते समय यह विवरण पास रखें:\n"
                    "  1. 12 अंकों का UPI UTR / Reference Number।\n"
                    "  2. खाते से पैसे कटने का सही समय और तारीख।\n"
                    "  3. आपका बैंक खाता नंबर और बैंक का नाम।\n"
                    "  4. जालसाज की UPI ID (VPA) या मोबाइल नंबर।\n"
                    "• पावती टोकन: कॉल पूरी होने के बाद आपको SMS में NCRP शिकायत टोकन मिलेगा, जिसके आधार पर 24 घंटे में cybercrime.gov.in पर अंतिम शिकायत दर्ज करनी होगी।" + ctx_info
                )

            else:
                ctx_info = f"\n\nVerified Case Details: Quote your 12-digit UTR '{utr_str}', disputed amount '{amount_str}', and beneficiary VPA '{vpa_str}' directly to the operator." if utr_str else ""
                if senior_mode:
                    return (
                        "📞 1930 Cyber Helpline – Easy Senior Citizen Guide:\n\n"
                        "1. Immediately dial 1930 from your mobile or landline (Official Government of India Cyber Helpline).\n"
                        "2. Dialing during the 'Golden Hour' (first 2-3 hours) is critical to prevent scammers from cashing out.\n"
                        "3. Keep your bank passbook and 12-digit UPI UTR number ready.\n"
                        "4. The operator will record the details and send a formal NCRP Acknowledgement Token via SMS.\n"
                        "5. Please keep a trusted family member beside you for reassurance." + ctx_info
                    )
                return (
                    "📞 How to Contact the 1930 National Cybercrime Reporting Helpline:\n\n"
                    "• The Golden Hour Advantage: Calling 1930 within the first 2-3 hours connects you to the Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS), which alerts beneficiary banks in real time to stop fund dispersion.\n\n"
                    "• What to Have Ready Before Dialing:\n"
                    "  1. 12-Digit UPI Transaction ID / UTR number from your bank debit SMS.\n"
                    "  2. Exact timestamp of the debit.\n"
                    "  3. Remitter bank account number and bank name.\n"
                    "  4. Beneficiary UPI VPA (e.g., fraudster@ybl).\n\n"
                    "• Next Step: Note the NCRP Acknowledgement Token sent via SMS. You must complete your formal ticket at cybercrime.gov.in within 24 hours citing this token." + ctx_info
                )

        # =====================================================================
        # 2. OFFICIAL CYBERCRIME PORTAL (cybercrime.gov.in)
        # =====================================================================
        if topic == AssistantTopic.CYBERCRIME_PORTAL:
            if language == AssistantLanguage.TE:
                return (
                    "🌐 cybercrime.gov.in అధికారిక పోర్టల్‌లో ఫిర్యాదు చేసే విధానం:\n\n"
                    "1. అధికారిక వెబ్‌సైట్ https://cybercrime.gov.in ఓపెన్ చేయండి.\n"
                    "2. 'Report Financial Fraud' (ఆర్థిక మోసం) విభాగాన్ని ఎంచుకోండి.\n"
                    "3. మీ మొబైల్ నంబర్ మరియు OTP తో Citizen Login చేయండి.\n"
                    "4. 'Incident Details' లో మోసం జరిగిన తేదీ, సమయం, మరియు 12 అంకెల UTR నంబర్ నమోదు చేయండి.\n"
                    "5. ఆధారాల స్క్రీన్‌షాట్‌లు (రసీదు, మోసపూరిత SMS, WhatsApp చాట్) అప్‌లోడ్ చేయండి.\n"
                    "6. ఫిర్యాదు సమర్పించాక మీ అక్నాలెడ్జ్‌మెంట్ నంబర్ (Acknowledgement Number) డౌన్‌లోడ్ చేసుకోండి.\n\n"
                    "ముఖ్య గమనిక: GoldenHour మీ తరఫున ఆటోమేటిక్‌గా పోలీసులకు ఫిర్యాదు చేయదు; పౌరులే స్వయంగా అధికారిక పోర్టల్‌లో నమోదు చేయాలి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "🌐 cybercrime.gov.in आधिकारिक पोर्टल पर शिकायत दर्ज करने की प्रक्रिया:\n\n"
                    "1. भारत सरकार के आधिकारिक पोर्टल https://cybercrime.gov.in पर जाएं।\n"
                    "2. 'Report Financial Fraud' (वित्तीय धोखाधड़ी रिपोर्ट करें) विकल्प चुनें।\n"
                    "3. अपने वैध मोबाइल नंबर और OTP से Citizen Login करें।\n"
                    "4. घटना का विवरण (Incident Details): सही तारीख, समय और 12 अंकों का UTR नंबर दर्ज करें।\n"
                    "5. साक्ष्य अपलोड करें: बैंक डेबिट SMS, PhonePe/GPay रसीद और व्हाट्सएप चैट के स्क्रीनशॉट अटैच करें।\n"
                    "6. शिकायत दर्ज होने के बाद पावती पर्ची (Acknowledgement Receipt) सुरक्षित डाउनलोड करें।\n\n"
                    "ध्यान दें: GoldenHour कभी भी स्वचालित रूप से पुलिस शिकायत दर्ज नहीं करता; यह केवल शिकायतकर्ता द्वारा स्वयं आधिकारिक पोर्टल पर दर्ज की जानी चाहिए।"
                )
            else:
                return (
                    "🌐 Official Cybercrime Reporting Portal (cybercrime.gov.in) Procedure:\n\n"
                    "1. Visit the verified portal: https://cybercrime.gov.in\n"
                    "2. Click on 'Report Financial Fraud' (managed by Ministry of Home Affairs I4C).\n"
                    "3. Log in using your Indian mobile number via OTP.\n"
                    "4. Fill in Transaction Parameters:\n"
                    "   - Payment Mode: UPI\n"
                    "   - 12-Digit Reference / UTR Number\n"
                    "   - Amount Debited & Exact Timestamp\n"
                    "   - Beneficiary VPA and receiving bank name (if known)\n"
                    "5. Attach Digital Evidence: Upload uncropped payment receipts and scam communication screenshots.\n"
                    "6. Record Your NCRP Acknowledgement Number: Use this reference when following up with your local cyber cell or bank nodal team."
                )

        # =====================================================================
        # 3. EVIDENCE PRESERVATION
        # =====================================================================
        if topic == AssistantTopic.EVIDENCE_PRESERVATION:
            if language == AssistantLanguage.TE:
                return (
                    "📁 సైబర్ మోసంలో భద్రపరచవలసిన కీలక ఆధారాల జాబితా:\n\n"
                    "1. పూర్తి UPI చెల్లింపు రసీదు: 12 అంకెల UTR నంబర్, తేదీ, సమయం మరియు లబ్ధిదారుడి UPI ID స్పష్టంగా కనిపించే అన్‌క్రాప్డ్ స్క్రీన్‌షాట్.\n"
                    "2. బ్యాంక్ డెబిట్ SMS: మీ ఖాతా నుండి డబ్బు కట్ అయినట్లు వచ్చిన అధికారిక బ్యాంక్ SMS.\n"
                    "3. అనుమానాస్పద లింక్ లేదా SMS: మోసగాడు పంపిన మెసేజ్ మరియు పంపినవారి ఆల్ఫాన్యూమరిక్ హెడర్ (ఉదా: VK-POWERC).\n"
                    "4. చాట్ సంభాషణలు: WhatsApp లేదా Telegram లో మోసగాడితో జరిగిన పూర్తి చాట్ హిస్టరీ (చాట్‌ను డిలీట్ చేయకండి).\n"
                    "5. కాల్ లాగ్‌లు: మోసగాడు మీకు కాల్ చేసిన మొబైల్ నంబర్ మరియు సమయం స్క్రీన్‌షాట్.\n"
                    "6. బ్యాంక్ పాస్‌బుక్ / స్టేట్‌మెంట్: మోసపూరిత లావాదేవీని హైలైట్ చేస్తూ PDF కాపీ."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "📁 सुरक्षित रखे जाने वाले डिजिटल सबूतों की अनिवार्य सूची:\n\n"
                    "1. संपूर्ण UPI भुगतान रसीद: 12 अंकों का UTR नंबर, तारीख, समय और प्राप्तकर्ता VPA वाला अनक्रॉप्ड (Uncropped) स्क्रीनशॉट।\n"
                    "2. बैंक का डेबिट SMS: आपके बैंक से आए आधिकारिक पैसे कटने के SMS का स्क्रीनशॉट।\n"
                    "3. धोखाधड़ी संदेश/लिंक: बिजली बिल, लॉटरी या इनाम का लालच देने वाला मूल SMS।\n"
                    "4. व्हाट्सएप/टेलीग्राम चैट: जालसाज के साथ हुई पूरी बातचीत (चैट कभी डिलीट न करें)।\n"
                    "5. कॉल लॉग (Call Log): जिस नंबर से कॉल आया था, उसकी तारीख और कॉल अवधि का स्क्रीनशॉट।\n"
                    "6. बैंक स्टेटमेंट: जिसमें अनधिकृत कटौती साफ तौर पर चिन्हित हो।"
                )
            else:
                return (
                    "📁 Digital Evidence Preservation Checklist for UPI Fraud:\n\n"
                    "1. Uncropped Payment Receipt Screenshot: Showing the full 12-digit UTR / UPI Ref Number, transaction status, date, timestamp, and beneficiary VPA.\n"
                    "2. Official Bank Debit SMS: Showing the sender ID (e.g., AD-HDFCBK) and debit confirmation.\n"
                    "3. Scam Messages & Payment Links: Phishing text messages with sender header (e.g. VK-POWERC) and suspicious APK/web URLs.\n"
                    "4. Chat Transcripts: Complete WhatsApp, Telegram, or OLX conversations. Do NOT delete the chat or block the number before exporting the chat archive.\n"
                    "5. Call Logs: Timestamped screenshot of incoming fraud calls showing caller phone numbers.\n"
                    "6. Official Bank Statement / M-Banking Passbook: Highlighting the unauthorized debit."
                )

        # =====================================================================
        # 4. REPORTING FRAUD VS. FREEZING AN ACCOUNT (KEY DIFFERENCE)
        # =====================================================================
        if topic == AssistantTopic.BANK_DISPUTE_VS_FREEZE:
            if language == AssistantLanguage.TE:
                return (
                    "⚖️ సైబర్ ఫిర్యాదు (Reporting) మరియు ఖాతా ఫ్రీజ్ (Account Freeze) మధ్య ముఖ్యమైన తేడా:\n\n"
                    "1. సైబర్ మోసం ఫిర్యాదు (Reporting Fraud):\n"
                    "   • ఇది 1930 లేదా cybercrime.gov.in లో నమోదు చేసే అధికారిక దర్యాప్తు ఫిర్యాదు.\n"
                    "   • ఇది పోలీసుల రికార్డులలో మోసాన్ని నమోదు చేసి NCRP అక్నాలెడ్జ్‌మెంట్ నంబర్‌ను సృష్టిస్తుంది.\n"
                    "   • ఫిర్యాదు చేయడం వలన నేరుగా డబ్బు రికవరీ అవ్వదు.\n\n"
                    "2. లీన్ / ఖాతా ఫ్రీజ్ (Account Freeze / Lien Marking):\n"
                    "   • ఇది మోసగాడి బ్యాంక్ ఖాతాలో ఉన్న వివాదాస్పద మొత్తాన్ని తాత్కాలికంగా ఆపివేయడం (Debit Freeze).\n"
                    "   • 1930 నోటిఫికేషన్ ద్వారా లేదా పోలీస్ ఆదేశాల (Section 102) ద్వారా లబ్ధిదారుడి బ్యాంక్ మాత్రమే ఈ చర్య తీసుకుంటుంది.\n"
                    "   • గోల్డెన్‌అవర్ లేదా ఏ AI కూడా ఖాతాను నేరుగా ఫ్రీజ్ చేయలేదు — ఇది కేవలం సంబంధిత బ్యాంక్ మరియు పోలీసుల చట్టబద్ధమైన అధికార పరిధి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "⚖️ धोखाधड़ी की रिपोर्टिंग (Reporting) और बैंक खाता फ्रीज (Account Freeze) में अंतर:\n\n"
                    "1. फ्रॉड रिपोर्टिंग (Reporting Fraud):\n"
                    "   • यह 1930 हेल्पलाइन या cybercrime.gov.in पर की जाने वाली आधिकारिक कानूनी शिकायत है।\n"
                    "   • इससे पुलिस में मामला दर्ज होता है और एक औपचारिक NCRP टोकन नंबर जारी होता है।\n"
                    "   • केवल रिपोर्ट करने से स्वतः पैसा वापस नहीं आता है।\n\n"
                    "2. बैंक खाता फ्रीज / लीन मार्किंग (Account Lien / Debit Freeze):\n"
                    "   • यह जालसाज के खाते में से केवल विवादित राशि की निकासी रोकने की प्रशासनिक कार्रवाई है।\n"
                    "   • यह कार्रवाई केवल प्राप्तकर्ता बैंक (Beneficiary Bank) पुलिस या 1930 पोर्टल के आधिकारिक निर्देश पर करता है।\n"
                    "   • GoldenHour या कोई भी AI ऐप किसी खाते को सीधे फ्रीज नहीं कर सकता; यह केवल बैंकों और कानून प्रवर्तन एजेंसियों का वैधानिक अधिकार है।"
                )
            else:
                return (
                    "⚖️ Key Difference: Reporting a Fraud vs. Requesting a Bank Account Freeze:\n\n"
                    "1. Reporting a Fraud (Formal NCRP Complaint):\n"
                    "   • Purpose: Lodging an official police record of the cybercrime on 1930 or cybercrime.gov.in.\n"
                    "   • Result: Issues a formal NCRP Acknowledgement Number and triggers investigative tracking.\n"
                    "   • Note: Filing a report alone does not automatically return your money.\n\n"
                    "2. Account Freeze / Lien Marking (Administrative Fund Hold):\n"
                    "   • Purpose: Instructing the receiving bank (beneficiary bank) to place a temporary debit hold on the specific disputed amount in the fraudster's account.\n"
                    "   • Authority: ONLY the beneficiary bank or authorized police officer (under Section 102 CrPC / BNSS) possesses legal authority to freeze an account.\n"
                    "   • GoldenHour Safeguard: GoldenHour guides you on requesting a lien from your bank, but NEVER claims an account has already been frozen."
                )

        # =====================================================================
        # 5. SENIOR CITIZEN SIMPLE STEP-BY-STEP GUIDANCE
        # =====================================================================
        if topic == AssistantTopic.SENIOR_CITIZEN_GUIDANCE or senior_mode:
            if language == AssistantLanguage.TE:
                return (
                    "👴 సీనియర్ సిటిజన్ సులభ రక్షణ మార్గదర్శి (నాలుగు సులభ దశలు):\n\n"
                    "• మొదట ప్రశాంతంగా ఉండండి: సైబర్ మోసం జరగడం మీ తప్పు కాదు; మోసగాళ్ళు అత్యాధునిక పద్ధతులు ఉపయోగిస్తున్నారు.\n\n"
                    "దశ 1: వెంటనే 1930 నంబర్‌కు కాల్ చేయండి.\n"
                    "మీ బ్యాంక్ పేరు మరియు డబ్బు కట్ అయిన 12 అంకెల UTR నంబర్ చెప్పండి.\n\n"
                    "దశ 2: మీ స్వంత బ్యాంక్ బ్రాంచ్‌ను సంప్రదించండి.\n"
                    "మేనేజర్‌కు అనధికారిక లావాదేవీ జరిగిందని రాతపూర్వకంగా తెలపండి.\n\n"
                    "దశ 3: ఎవరికీ PIN లేదా OTP చెప్పవద్దు.\n"
                    "డబ్బు వాపస్ ఇస్తామని ఎవరైనా కాల్ చేసి OTP లేదా PIN అడిగితే వెంటనే కాల్ కట్ చేయండి.\n\n"
                    "దశ 4: మీ కుటుంబ సభ్యుడి సహాయం తీసుకోండి.\n"
                    "ఈ దశలను పూర్తి చేయడానికి మీ పిల్లలు లేదా నమ్మకమైన బంధువుల సహాయం కోరండి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "👴 वरिष्ठ नागरिकों के लिए सरल 4-चरणीय सुरक्षा मार्गदर्शिका:\n\n"
                    "• सबसे पहले घबराएं नहीं: यह आपकी गलती नहीं है; साइबर अपराधी लोगों को भ्रमित करने में माहिर होते हैं।\n\n"
                    "कदम 1: तुरंत अपने फोन से 1930 डायल करें।\n"
                    "ऑपरेटर को अपने बैंक का नाम और पैसे कटने का 12 अंकों का UTR नंबर बताएं।\n\n"
                    "कदम 2: अपने बैंक की नजदीकी शाखा में संपर्क करें।\n"
                    "शाखा प्रबंधक (Branch Manager) को एक लिखित शिकायत पत्र दें कि आपके खाते से अनधिकृत कटौती हुई है।\n\n"
                    "कदम 3: कभी भी किसी को PIN या OTP न बताएं।\n"
                    "पैसे वापस दिलाने के नाम पर यदि कोई अनजान व्यक्ति फोन करे और पासवर्ड मांगे, तो तुरंत फोन काट दें।\n\n"
                    "कदम 4: परिवार के किसी सदस्य की मदद लें।\n"
                    "आधिकारिक पोर्टल पर रिपोर्ट दर्ज करने के लिए अपने बच्चों या किसी विश्वसनीय परिजन का सहारा लें।"
                )
            else:
                return (
                    "👴 Simple 4-Step Guidance for Senior Citizens:\n\n"
                    "• First, please take a deep breath: Cyber fraud happens to thousands of honest citizens daily. Do not blame yourself.\n\n"
                    "Step 1: Dial 1930 from your phone immediately.\n"
                    "Tell the operator you suffered an unauthorized UPI debit. Give them your bank name and the 12-digit UTR number from your SMS.\n\n"
                    "Step 2: Visit your home bank branch or call their toll-free number.\n"
                    "Ask the manager to log an unauthorized electronic debit dispute under RBI Customer Protection guidelines.\n\n"
                    "Step 3: NEVER share your UPI PIN or OTP.\n"
                    "Scammers often call back pretending to be 'cyber police' or 'bank support' offering a refund. A refund NEVER requires entering a PIN.\n\n"
                    "Step 4: Involve a trusted family member.\n"
                    "Have a family member assist you in organizing screenshots and submitting the complaint on cybercrime.gov.in."
                )

        # =====================================================================
        # 6. BANK DISPUTE & RBI ZERO LIABILITY GUIDELINES
        # =====================================================================
        if language == AssistantLanguage.TE:
            return (
                "🏦 బ్యాంక్ వివాద పరిష్కార విధానం & RBI జీరో లయబిలిటీ నియమాలు:\n\n"
                "• RBI సర్క్యులర్ (RBI/2017-18/15) ప్రాముఖ్యత: మీ ప్రమేయం లేకుండా అనధికారిక లావాదేవీ జరిగినప్పుడు, 3 పనిదినాలలోపు మీ బ్యాంక్‌కు సమాచారం అందిస్తే, మీ లయబిలిటీ జీరో (Zero Liability) గా పరిగణించబడుతుంది.\n"
                "• బ్యాంక్ వద్ద చేయవలసిన చర్యలు:\n"
                "  1. మీ బ్యాంక్ కస్టమర్ కేర్ లేదా హోమ్ బ్రాంచ్‌కు తక్షణమే రాతపూర్వక వివాద పత్రాన్ని (Dispute Letter) సమర్పించండి.\n"
                "  2. వివాద రిఫరెన్స్ నంబర్ (Dispute Ticket Number) ను తప్పక పొందండి.\n"
                "  3. అవసరమైతే మీ UPI సేవలను తాత్కాలికంగా బ్లాక్ చేయమని కోరండి.\n"
                "• లీన్ అభ్యర్థన: మోసగాడి బ్యాంక్‌కు నోడల్ ఆఫీసర్ ద్వారా తక్షణ 'లీన్ నోటీసు' పంపించమని మీ బ్యాంక్‌ను అభ్యర్థించండి."
            )
        elif language == AssistantLanguage.HI:
            return (
                "🏦 बैंक विवाद निवारण प्रक्रिया और RBI जीरो लायबिलिटी दिशानिर्देश:\n\n"
                "• RBI मास्टर सर्कुलर (RBI/2017-18/15): यदि आप अनधिकृत इलेक्ट्रॉनिक लेनदेन की सूचना 3 कार्य दिवसों के भीतर अपने बैंक को देते हैं, तो ग्राहक की देयता शून्य (Zero Customer Liability) मानी जाती है।\n"
                "• बैंक में उठाए जाने वाले आवश्यक कदम:\n"
                "  1. अपनी बैंक शाखा या कस्टमर केयर में तुरंत औपचारिक लिखित विवाद पत्र (Dispute Letter) जमा करें।\n"
                "  2. अपने विवाद की लिखित पावती या डिस्प्यूट टिकट नंबर अवश्य लें।\n"
                "  3. अपने बैंक के नोडल अधिकारी (Nodal Officer) से लाभार्थी बैंक को तत्काल लीन नोटिस भेजने का अनुरोध करें।\n"
                "  4. सुरक्षा के लिए अपनी UPI आईडी को अस्थायी रूप से ब्लॉक करने का अनुरोध करें।"
            )
        else:
            return (
                "🏦 Bank Dispute Procedures & RBI Customer Protection Framework:\n\n"
                "• RBI Circular RBI/2017-18/15 (Zero / Limited Liability):\n"
                "  - If you notify your bank within 3 working days of an unauthorized electronic transaction, customer liability is ZERO.\n"
                "  - If reported between 4 to 7 working days, customer liability is limited to a statutory maximum (e.g., ₹10,000 for savings accounts).\n\n"
                "• Mandatory Bank Dispute Steps:\n"
                "  1. Submit a formal written dispute letter to your home branch or email the Principal Nodal Officer.\n"
                "  2. Obtain an official Dispute Reference / Service Request Number from the bank.\n"
                "  3. Request your bank's Fraud Desk to notify the beneficiary bank's nodal officer to mark a lien on the fraudster's VPA.\n"
                "  4. Temporarily freeze UPI privileges on your account until credentials are reset."
            )

    def _get_quick_actions(self, topic: AssistantTopic, lang: AssistantLanguage) -> List[QuickAction]:
        """Generates dynamic quick-action buttons matching topic and language."""
        if lang == AssistantLanguage.TE:
            return [
                QuickAction(label="1930 కి కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="ఉచిత సైబర్ హెల్ప్‌లైన్"),
                QuickAction(label="అధికారిక సైబర్ పోర్టల్", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="cybercrime.gov.in"),
                QuickAction(label="కేసు రసీదులు చూడండి", action_type="NAVIGATE", action_target="/dashboard/cases", description="ఎవిడెన్స్ వాల్ట్")
            ]
        elif lang == AssistantLanguage.HI:
            return [
                QuickAction(label="1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="निशुल्क राष्ट्रीय हेल्पलाइन"),
                QuickAction(label="साइबर पोर्टल खोलें", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="cybercrime.gov.in"),
                QuickAction(label="केस विवरण देखें", action_type="NAVIGATE", action_target="/dashboard/cases", description="सबूत वॉल्ट")
            ]
        else:
            return [
                QuickAction(label="Call 1930 Helpline", action_type="CALL", action_target="tel:1930", description="Toll-Free National Helpline"),
                QuickAction(label="Open cybercrime.gov.in", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="Official Police Portal"),
                QuickAction(label="View Case Vault", action_type="NAVIGATE", action_target="/dashboard/cases", description="Evidence Details")
            ]

    def _get_follow_ups(self, topic: AssistantTopic, lang: AssistantLanguage) -> List[str]:
        """Suggests relevant follow-up questions."""
        if lang == AssistantLanguage.TE:
            return [
                "1930 కి కాల్ చేయడానికి ముందు ఏ ఆధారాలు కావాలి?",
                "ఫిర్యాదు మరియు ఖాతా ఫ్రీజ్ మధ్య తేడా ఏమిటి?",
                "బ్యాంక్ నుండి డబ్బు వాపస్ పొందడానికి RBI నియమం ఏమిటి?",
                "సీనియర్ సిటిజన్ సులభ సూచనలు ఏమిటి?"
            ]
        elif lang == AssistantLanguage.HI:
            return [
                "1930 पर कॉल करने से पहले क्या विवरण तैयार रखें?",
                "फ्रॉड रिपोर्टिंग और बैंक खाता फ्रीज में क्या अंतर है?",
                "पैसे वापसी के संबंध में RBI के क्या नियम हैं?",
                "वरिष्ठ नागरिकों के लिए आसान कदम क्या हैं?"
            ]
        else:
            return [
                "What details are required before dialing 1930?",
                "What is the difference between reporting fraud and freezing an account?",
                "What are the RBI Zero Liability rules for UPI fraud?",
                "How should a senior citizen handle this situation?"
            ]

    def _call_claude(
        self,
        message: str,
        language: AssistantLanguage,
        topic: AssistantTopic,
        case_context: Optional[Dict[str, Any]],
        senior_mode: bool,
        history: List[Dict[str, str]]
    ) -> Optional[str]:
        """Calls Claude API with language-specific instructions and strict security guardrails."""
        if not self.client:
            return None

        lang_name = "English"
        if language == AssistantLanguage.TE:
            lang_name = "Telugu (తెలుగు)"
        elif language == AssistantLanguage.HI:
            lang_name = "Hindi (हिंदी)"

        system_prompt = (
            f"You are GoldenHour AI Emergency Cyber Assistant, specializing in Indian UPI fraud guidance. "
            f"Respond exclusively in {lang_name}. "
            f"CRITICAL SAFETY MANDATES:\n"
            f"1. NEVER ask for, echo, or store UPI PINs, MPINs, OTPs, CVVs, or banking passwords.\n"
            f"2. NEVER promise 100% money recovery.\n"
            f"3. NEVER claim an account has already been frozen.\n"
            f"4. NEVER submit complaints automatically. Direct the citizen to official channels (1930 helpline, cybercrime.gov.in).\n"
            f"5. Base your knowledge on Ministry of Home Affairs I4C, National Cyber Crime Reporting Portal (1930), and RBI Circular RBI/2017-18/15.\n"
            f"6. If senior_citizen_mode is True, use very simple words, high empathy, numbered steps, and a calm reassuring tone."
        )

        if case_context:
            system_prompt += f"\n\nCitizen's Verified Incident Context:\n{case_context}"

        messages = []
        for h in history[-4:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        resp = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            system=system_prompt,
            messages=messages
        )
        return resp.content[0].text if resp.content else None


assistant_service = AssistantService()
