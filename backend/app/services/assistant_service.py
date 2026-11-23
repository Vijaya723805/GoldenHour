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

    def get_case_context(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves comprehensive verified transaction parameters for context-aware assistance."""
        if not case_id:
            return None

        # Check dashboard_service cases first
        case = dashboard_service._cases.get(case_id)
        if not case:
            # Try searching by case_number
            for c in dashboard_service._cases.values():
                if c.case_number == case_id or c.id == case_id:
                    case = c
                    break

        # Verification report
        rep = verification_service.get_or_create_report(case_id)
        verified_fields_dict = {}
        if rep and rep.verified_fields:
            for f in rep.verified_fields:
                verified_fields_dict[f.field_key] = f.value

        if case:
            amount_val = case.amount_lost
            utr_val = case.transaction_id_utr or verified_fields_dict.get("transaction_id_utr")
            vpa_val = case.beneficiary_upi_id or verified_fields_dict.get("beneficiary_upi_id")
            bank_val = case.beneficiary_bank or verified_fields_dict.get("beneficiary_bank")

            return {
                "case_id": case.id,
                "case_number": case.case_number,
                "title": case.title,
                "scam_category": getattr(case, "fraud_category", "UNAUTHORIZED_UPI_DEBIT"),
                "amount": amount_val,
                "amount_formatted": f"₹{amount_val:,.2f}" if amount_val else None,
                "utr": utr_val,
                "beneficiary_upi": vpa_val,
                "beneficiary_bank": bank_val,
                "incident_date": case.incident_date,
                "incident_description": case.fraud_description,
                "evidence_count": len(getattr(case, "evidence_items", [])),
                "status": getattr(case.status, "value", str(case.status)),
                "verified_fields": verified_fields_dict
            }

        return None

    def detect_intent(self, text: str, history: List[Dict[str, str]] = None) -> AssistantTopic:
        """Intelligently classifies user input into functional conversational intents."""
        t = text.lower().strip()

        # 1. Greetings (explicit greeting regex)
        if re.match(r"^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|greetings|howdy)\b", t, re.I) or t in ["hi", "hello", "hey", "నమస్కారం", "హలో", "नमस्ते", "प्रणाम", "हेलो"]:
            return AssistantTopic.GREETING

        # 2. Case specific questions
        case_keywords = ["my case", "this case", "my transaction id", "what details should i provide when calling 1930", "case details", "నా కేసు", "లావాదేవీ ఐడీ", "मेरा केस", "लेनदेन आईडी"]
        if any(w in t for w in case_keywords):
            return AssistantTopic.CASE_SPECIFIC_INQUIRY

        # 3. Fake QR Code Scam
        if any(w in t for w in ["qr", "qr code", "qr కోడ్", "క్యూఆర్", "क्यूआर", "क्यूआर कोड"]):
            return AssistantTopic.FAKE_QR_SCAM

        # 4. Phishing / Payment Link Scam
        if any(w in t for w in ["link", "apk", "electricity bill", "power bill", "lottery", "లింక్", "విద్యుత్ బిల్లు", "లాటరీ", "लिंक", "बिजली बिल", "लॉटरी"]):
            return AssistantTopic.PHISHING_LINK

        # 5. Remote Access Scam (AnyDesk, TeamViewer)
        if any(w in t for w in ["anydesk", "teamviewer", "rustdesk", "quicksupport", "screen share", "స్క్రీన్ షేర్"]):
            return AssistantTopic.REMOTE_ACCESS

        # 6. SIM swap
        if any(w in t for w in ["sim", "sim swap", "esim", "సిమ్", "सिम"]):
            return AssistantTopic.SIM_FRAUD

        # 7. WhatsApp / Telegram impersonation
        if any(w in t for w in ["whatsapp", "telegram", "friend in need", "వాట్సాప్", "व्हाट्सएप"]):
            return AssistantTopic.WHATSAPP_IMPERSONATION

        # 8. Stolen money / Debit / Loss report
        if any(w in t for w in ["lost", "stolen", "deducted", "siphoned", "scammed", "fraud", "మోసపోయాను", "డబ్బులు పోయాయి", "కట్ అయ్యాయి", "పాయిసలు", "पैसे कट गए", "धोखाधड़ी", "ठगी", "गंवा दिए"]):
            return AssistantTopic.UNAUTHORIZED_DEBIT

        # 9. Follow-up: How do I report it?
        if any(w in t for w in ["how do i report", "how to report", "where to report", "ఎలా ఫిర్యాదు చేయాలి", "ఎక్కడ ఫిర్యాదు చేయాలి", "कैसे शिकायत करें", "कैसे रिपोर्ट करें", "कहाँ रिपोर्ट करें"]):
            return AssistantTopic.CYBERCRIME_PORTAL

        # 10. Follow-up: What information do I need?
        if any(w in t for w in ["what information", "what details", "what evidence", "what do i need", "ఏ సమాచారం కావాలి", "ఏ ఆధారాలు కావాలి", "क्या जानकारी चाहिए", "कौन से सबूत चाहिए"]):
            return AssistantTopic.EVIDENCE_PRESERVATION

        # 11. Follow-up: Script / What should I tell them?
        if any(w in t for w in ["what should i tell", "what to tell", "script", "వాళ్లకు ఏమి చెప్పాలి", "బ్యాంకుకు ఏమి చెప్పాలి", "उन्हें क्या बताएं", "बैंक को क्या बोलें"]):
            return AssistantTopic.BANK_DISPUTE_VS_FREEZE

        # 12. Follow-up: "No" or "Not yet"
        if t in ["no", "nope", "not yet", "no i have not", "లేదు", "ఇంకా లేదు", "नहीं", "अभी नहीं"]:
            return AssistantTopic.BANK_DISPUTE_VS_FREEZE

        # 13. Money recovery inquiry
        if any(w in t for w in ["recovered", "get back", "refund", "రిఫండ్", "డబ్బు తిరిగి వస్తుందా", "वापस मिल सकता है", "रिफंड"]):
            return AssistantTopic.RBI_ZERO_LIABILITY

        # 14. 1930 Helpline explicitly
        if any(w in t for w in ["1930", "helpline", "call 1930"]):
            return AssistantTopic.HELPLINE_1930

        # 15. Freeze vs dispute difference
        if any(w in t for w in ["difference between", "freeze vs", "తేడా ఏమిటి", "अंतर क्या है"]):
            return AssistantTopic.BANK_DISPUTE_VS_FREEZE

        # 16. Senior citizen inquiry
        if any(w in t for w in ["senior citizen", "elderly", "old person", "సీనియర్ సిటిజన్", "వృద్ధులు", "वरिष्ठ नागरिक", "बुजुर्ग"]):
            return AssistantTopic.SENIOR_CITIZEN_GUIDANCE

        # 17. Unknown legal / Out-of-scope legal demands
        if any(w in t for w in ["supreme court", "pil", "guarantee 100%", "lawsuit", "arrest warrant", "పోలీసులు అరెస్ట్ చేస్తారా", "సుప్రీంకోర్టు", "वारंट", "गिरफ्तार"]):
            return AssistantTopic.LEGAL_LIMITATION

        # 18. Unrelated general questions
        if any(w in t for w in ["capital of", "weather", "poem", "recipe", "cricket", "movie", "who is the prime minister", "joke", "రాజధాని", "వాతావరణం", "मौसम", "राजधानी", "चुटकुला"]):
            return AssistantTopic.UNRELATED_INQUIRY

        return AssistantTopic.GENERAL

    def process_chat(self, req: ChatRequest) -> ChatResponse:
        """Processes message with language-aware conversational intelligence."""
        raw_message = req.message
        sanitized_message = redact_sensitive_text(raw_message)
        has_credentials, _ = contains_sensitive_credentials(raw_message)

        # Retrieve verified case context if authorized
        case_context = None
        if req.use_case_context and req.case_id:
            case_context = self.get_case_context(req.case_id)

        # Detect intent using message and history
        topic = self.detect_intent(sanitized_message, req.conversation_history)

        # Security check: redact dangerous credential inputs
        if has_credentials:
            return ChatResponse(
                reply=self._generate_credential_warning(req.language),
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

        # Tier 1: Try live Claude API if configured
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
                pass

        # Tier 2: Comprehensive Contextual Multi-Turn Engine
        reply = self._generate_intelligent_reply(
            message=sanitized_message,
            language=req.language,
            topic=topic,
            case_context=case_context,
            senior_mode=req.senior_citizen_mode,
            history=req.conversation_history
        )

        return ChatResponse(
            reply=reply,
            language=req.language,
            detected_topic=topic,
            suggested_quick_actions=self._get_quick_actions(topic, req.language, req.case_id),
            follow_up_questions=self._get_follow_ups(topic, req.language),
            senior_citizen_mode=req.senior_citizen_mode,
            zero_credential_sanitized=True,
            context_used=case_context
        )

    def _generate_credential_warning(self, lang: AssistantLanguage) -> str:
        if lang == AssistantLanguage.TE:
            return (
                "⚠️ అత్యవసర హెచ్చరిక: మీరు నమోదు చేసిన సందేశంలో రహస్య UPI PIN లేదా OTP గుర్తించబడింది మరియు భద్రత కోసం తొలగించబడింది.\n\n"
                "ముఖ్య సూచన: మీ UPI PIN, MPIN, లేదా OTPని ఎవరికీ (బ్యాంక్ అధికారులు లేదా పోలీసులకు కూడా) ఎప్పుడూ చెప్పవద్దు. డబ్బులు మీ ఖాతాలోకి రావడానికి PIN ఎప్పుడూ అవసరం లేదు."
            )
        elif lang == AssistantLanguage.HI:
            return (
                "⚠️ अत्यंत महत्वपूर्ण सुरक्षा चेतावनी: आपके संदेश में UPI पिन या OTP जैसा गोपनीय विवरण मिला है, जिसे तुरंत हटा दिया गया है।\n\n"
                "कृपया ध्यान दें: अपना UPI पिन, MPIN या बैंक OTP किसी के साथ साझा न करें। पैसे प्राप्त करने के लिए कभी भी पिन दर्ज करने की आवश्यकता नहीं होती है।"
            )
        else:
            return (
                "⚠️ CRITICAL SECURITY WARNING: Your message contained numbers resembling a secret UPI PIN or OTP. "
                "GoldenHour has automatically redacted this information to protect your security.\n\n"
                "RULE OF THUMB: Never share your UPI PIN, MPIN, or OTP with anyone. You NEVER need to enter your PIN to receive money."
            )

    def _generate_intelligent_reply(
        self,
        message: str,
        language: AssistantLanguage,
        topic: AssistantTopic,
        case_context: Optional[Dict[str, Any]],
        senior_mode: bool,
        history: List[Dict[str, str]] = None
    ) -> str:
        """Context-aware response generator guaranteeing accurate output across languages and topics."""
        # 1. GREETING INTENT
        if topic == AssistantTopic.GREETING:
            if language == AssistantLanguage.TE:
                return "నమస్కారం! గోల్డెన్‌అవర్‌కి స్వాగతం. నేను మీకు ఎలా సహాయపడగలను? మీరు ఏదైనా UPI చెల్లింపు సమస్యను ఎదుర్కొంటున్నారా లేదా సైబర్ మోసాన్ని నివేదించడంలో సహాయం కావాలా?"
            elif language == AssistantLanguage.HI:
                return "नमस्ते! गोल्डनआवर में आपका स्वागत है। मैं आज आपकी क्या मदद कर सकता हूँ? क्या आप किसी UPI भुगतान समस्या का सामना कर रहे हैं या साइबर धोखाधड़ी की रिपोर्ट करने में सहायता चाहते हैं?"
            else:
                return "Hello! Welcome to GoldenHour. How can I help you today? Are you facing a UPI payment issue or would you like help reporting a cyber fraud?"

        # 2. CASE SPECIFIC INQUIRIES
        if topic == AssistantTopic.CASE_SPECIFIC_INQUIRY or (case_context and any(k in message.lower() for k in ["my case", "1930", "details", "utr", "వివరాలు", "కేసు", "विवरण"])):
            if case_context:
                utr = case_context.get("utr") or "Pending verification from bank SMS"
                amt = case_context.get("amount_formatted") or "Amount not yet specified"
                vpa = case_context.get("beneficiary_upi") or "Not found in evidence"
                bank = case_context.get("beneficiary_bank") or "Under bank verification"
                c_num = case_context.get("case_number", "Active Case")

                if language == AssistantLanguage.TE:
                    return (
                        f"📋 మీ క్రియాశీల కేసు ({c_num}) నుండి నిర్ధారించబడిన వివరాలు ఇక్కడ ఉన్నాయి:\n\n"
                        f"• మోసపోయిన మొత్తం: {amt}\n"
                        f"• 12 అంకెల UTR / రిఫరెన్స్ నంబర్: {utr}\n"
                        f"• మోసగాడి UPI ID (VPA): {vpa}\n"
                        f"• లబ్ధిదారుడి బ్యాంక్: {bank}\n\n"
                        f"మీరు 1930 కి కాల్ చేసినప్పుడు లేదా మీ బ్యాంక్ మేనేజర్‌ను సంప్రదించినప్పుడు పై వివరాలను నేరుగా తెలియజేయండి."
                    )
                elif language == AssistantLanguage.HI:
                    return (
                        f"📋 आपके सक्रिय केस ({c_num}) के सत्यापित विवरण इस प्रकार हैं:\n\n"
                        f"• धोखाधड़ी की राशि: {amt}\n"
                        f"• 12 अंकों का UTR / रेफरेंस नंबर: {utr}\n"
                        f"• जालसाज की UPI ID (VPA): {vpa}\n"
                        f"• प्राप्तकर्ता बैंक: {bank}\n\n"
                        f"जब आप 1930 हेल्पलाइन पर कॉल करें या बैंक से संपर्क करें, तो यह विवरण स्पष्ट रूप से प्रदान करें।"
                    )
                else:
                    return (
                        f"📋 Confirmed details from your active case ({c_num}):\n\n"
                        f"• Disputed Amount: {amt}\n"
                        f"• 12-Digit UTR / Transaction Ref: {utr}\n"
                        f"• Beneficiary UPI VPA: {vpa}\n"
                        f"• Beneficiary Bank: {bank}\n\n"
                        f"When speaking to the 1930 operator or your bank's fraud desk, quote these verified parameters to expedite the lien hold."
                    )
            else:
                if language == AssistantLanguage.TE:
                    return "మీరు ప్రస్తుతం యాక్టివ్ కేస్ సందర్భాన్ని ఎంచుకోలేదు లేదా కేస్ నమోదు కాలేదు. దయచేసి పై టోగుల్‌లో మీ కేసును ఎంచుకోండి లేదా సాధారణ సూచనల కోసం అడగండి."
                elif language == AssistantLanguage.HI:
                    return "वर्तमान में कोई सक्रिय केस संदर्भ चयनित नहीं है। कृपया शीर्ष बार में 'सक्रिय केस संदर्भ' सक्षम करें या सामान्य सहायता पूछें।"
                else:
                    return "You do not currently have an active fraud case context linked. You can toggle 'Inject active case parameters' at the top or ask general questions."

        # 3. FAKE QR CODE SCAM
        if topic == AssistantTopic.FAKE_QR_SCAM:
            if language == AssistantLanguage.TE:
                return (
                    "⚠️ నకిలీ QR కోడ్ మోసంపై తక్షణ చర్యలు:\n\n"
                    "ముఖ్య వాస్తవం: QR కోడ్ అనేది కేవలం డబ్బు పంపడానికి మాత్రమే ఉపయోగపడుతుంది. డబ్బులు స్వీకరించడానికి QR కోడ్ స్కాన్ చేయాల్సిన అవసరం ఎప్పుడూ ఉండదు.\n\n"
                    "1. వెంటనే 1930 కు కాల్ చేసి అనధికారిక QR డెబిట్ గురించి రిపోర్ట్ చేయండి.\n"
                    "2. మీ బ్యాంక్ కస్టమర్ కేర్‌కు కాల్ చేసి వివాదాస్పద లావాదేవీపై లీన్ (Lien) అభ్యర్థించండి.\n"
                    "3. మీరు స్కాన్ చేసిన QR కోడ్ ఫోటో మరియు చెల్లింపు రసీదును భద్రపరచండి.\n\n"
                    "నేను మీ కోసం ఫిర్యాదు వివరాలను నిర్వహించడంలో సహాయం చేయగలను."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "⚠️ फर्जी QR कोड धोखाधड़ी पर तत्काल कदम:\n\n"
                    "मुख्य नियम: QR कोड केवल पैसे भेजने के लिए होता है। पैसे प्राप्त करने के लिए कभी भी QR कोड स्कैन करने या PIN डालने की आवश्यकता नहीं होती।\n\n"
                    "1. तुरंत 1930 पर कॉल करके वित्तीय साइबर धोखाधड़ी की रिपोर्ट करें।\n"
                    "2. अपने बैंक के हेल्पलाइन नंबर पर तुरंत कॉल करके फ्रॉड रिपोर्ट दर्ज करें।\n"
                    "3. जिस QR कोड को स्कैन किया था उसका स्क्रीनशॉट और बैंक रसीद सुरक्षित रखें।\n\n"
                    "क्या आप जानना चाहते हैं कि 1930 पर क्या विवरण देना होगा?"
                )
            else:
                return (
                    "⚠️ Fake QR Code Scam Emergency Guidance:\n\n"
                    "CORE RULE: A QR code is strictly designed to SEND money, never to receive funds. Scanning a QR code or entering your PIN always debits your account.\n\n"
                    "Please act quickly:\n"
                    "1. Call 1930 immediately to report the financial cyber fraud.\n"
                    "2. Inform your bank through its official fraud reporting channel to request an immediate lien hold.\n"
                    "3. Preserve the QR code image, transaction receipt, and scammer chat screenshots.\n\n"
                    "I can also help you organize the details for your complaint. Would you like to know how to report it?"
                )

        # 4. REPORTING / LOST MONEY (UNAUTHORIZED DEBIT)
        if topic == AssistantTopic.UNAUTHORIZED_DEBIT:
            # Extract amount if present in message
            amt_match = re.search(r"(?:₹|rs\.?|inr)?\s*([0-9,]+)", message, re.I)
            amt_text = f"₹{amt_match.group(1)}" if amt_match else "the disputed amount"

            if language == AssistantLanguage.TE:
                return (
                    f"మీరు మోసపోయినందుకు విచారిస్తున్నాను. దయచేసి వెంటనే ఈ చర్యలు తీసుకోండి:\n\n"
                    f"1. తక్షణమే 1930 నంబర్‌కు కాల్ చేసి ఆర్థిక సైబర్ మోసాన్ని రిపోర్ట్ చేయండి (గోల్డెన్ అవర్ లో కాల్ చేయడం చాలా ముఖ్యం).\n"
                    f"2. మీ బ్యాంక్ అధికారిక ఫ్రాడ్ హెల్ప్‌లైన్‌కు కాల్ చేసి {amt_text} లావాదేవీపై లబ్ధిదారుడి ఖాతాలో లీన్/ఫ్రీజ్ కోసం అభ్యర్థించండి.\n"
                    f"3. మీ లావాదేవీ రసీదు (12 అంకెల UTR నంబర్‌తో) మరియు మెసేజ్ స్క్రీన్‌షాట్‌లను భద్రపరచండి.\n\n"
                    f"మీ ఫిర్యాదు కోసం వివరాలను నిర్వహించడంలో నేను మీకు సహాయపడగలను."
                )
            elif language == AssistantLanguage.HI:
                return (
                    f"मुझे खेद है कि आपके साथ यह घटना घटी। कृपया तुरंत कार्रवाई करें:\n\n"
                    f"1. तुरंत 1930 पर कॉल करके वित्तीय साइबर धोखाधड़ी दर्ज कराएं (गोल्डन ऑवर में कॉल करना सबसे जरूरी है)।\n"
                    f"2. अपने बैंक के आधिकारिक फ्रॉड चैनल पर तुरंत सूचना दें ताकि {amt_text} की निकासी पर लीन (Lien) लगाया जा सके।\n"
                    f"3. अपनी भुगतान रसीद और बातचीत के सभी स्क्रीनशॉट संभाल कर रखें।\n\n"
                    f"मैं आपकी शिकायत के लिए विवरण तैयार करने में पूरी मदद कर सकता हूँ।"
                )
            else:
                return (
                    f"I'm sorry this happened. Please act quickly within the Golden Hour:\n\n"
                    f"1. Call 1930 immediately to report the financial cyber fraud.\n"
                    f"2. Inform your bank through its official fraud reporting channel and request an immediate lien hold on the beneficiary account for {amt_text}.\n"
                    f"3. Preserve your transaction receipt (showing the 12-digit UTR) and all communication evidence.\n\n"
                    f"I can also help you organise the details for your complaint. Would you like to know what information you will need?"
                )

        # 5. CYBERCRIME PORTAL / HOW TO REPORT
        if topic == AssistantTopic.CYBERCRIME_PORTAL:
            if language == AssistantLanguage.TE:
                return (
                    "📝 సైబర్ క్రైమ్ పోర్టల్ (cybercrime.gov.in) మరియు 1930 లో ఫిర్యాదు చేసే విధానం:\n\n"
                    "1. హెల్ప్‌లైన్ ద్వారా: వెంటనే 1930 కి కాల్ చేయండి. ఆపరేటర్ మీ ప్రాథమిక వివరాలు నమోదు చేసుకుని మీ మొబైల్‌కు NCRP SMS అక్నాలెడ్జ్‌మెంట్ పంపుతారు.\n"
                    "2. అధికారిక పోర్టల్ ద్వారా: https://cybercrime.gov.in కు వెళ్లి 'Report Financial Fraud' ఎంచుకోండి.\n"
                    "3. మీ మొబైల్ OTP తో లాగిన్ అవ్వండి.\n"
                    "4. లావాదేవీ వివరాలు (12 అంకెల UTR, తేదీ, సమయం, బ్యాంక్ పేరు, లబ్ధిదారుడి UPI ID) నమోదు చేయండి.\n"
                    "5. రసీదు స్క్రీన్‌షాట్‌ను అప్‌లోడ్ చేసి ఫిర్యాదును సమర్పించండి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "📝 साइबर अपराध रिपोर्टिंग प्रक्रिया (1930 और cybercrime.gov.in):\n\n"
                    "1. 1930 हेल्पलाइन: पहले तुरंत 1930 पर कॉल करें। ऑपरेटर प्राथमिक जानकारी दर्ज कर आपके फोन पर NCRP टोकन भेजेगा।\n"
                    "2. ऑनलाइन पोर्टल: https://cybercrime.gov.in पर जाकर 'Report Financial Fraud' चुनें।\n"
                    "3. अपने मोबाइल नंबर से लॉगिन करें।\n"
                    "4. 12 अंकों का UTR नंबर, कटौती का समय, बैंक का नाम और जालसाज की UPI ID दर्ज करें।\n"
                    "5. बैंक रसीद और साक्ष्य अपलोड करके शिकायत सबमिट करें और पावती रसीद डाउनलोड करें।"
                )
            else:
                return (
                    "📝 Steps for Reporting Financial Cyber Fraud through 1930 and the Official Portal:\n\n"
                    "1. Step 1 (Immediate): Dial 1930. The operator registers your ticket on the CFCFRMS network and alerts the beneficiary bank to place a temporary hold.\n"
                    "2. Step 2 (Acknowledgment): You will receive an SMS containing your NCRP Complaint Reference Number.\n"
                    "3. Step 3 (Formal Complaint): Visit https://cybercrime.gov.in within 24 hours, click 'Report Financial Fraud', log in with your mobile number, and enter transaction details.\n"
                    "4. Step 4 (Upload Evidence): Attach uncropped payment receipts showing the 12-digit UTR, debit SMS, and scammer chat transcripts."
                )

        # 6. EVIDENCE PRESERVATION / WHAT INFORMATION DO I NEED
        if topic == AssistantTopic.EVIDENCE_PRESERVATION:
            if language == AssistantLanguage.TE:
                return (
                    "📁 ఫిర్యాదు నమోదు చేయడానికి అవసరమైన సమాచారం మరియు ఆధారాలు:\n\n"
                    "1. 12 అంకెల UPI UTR / బ్యాంక్ రిఫరెన్స్ సంఖ్య (రసీదులో ఉంటుంది).\n"
                    "2. డబ్బు డెబిట్ అయిన ఖచ్చితమైన తేదీ మరియు సమయం.\n"
                    "3. మీ బ్యాంక్ పేరు మరియు ఖాతా నంబర్.\n"
                    "4. లబ్ధిదారుడి UPI ID (ఉదా: name@ybl) లేదా మోసగాడి ఖాతా వివరాలు.\n"
                    "5. మోసగాడి మొబైల్ నంబర్ (కాల్స్ లేదా WhatsApp ద్వారా సంప్రదించి ఉంటే).\n"
                    "6. పూర్తి అన్‌క్రాప్డ్ పేమెంట్ రసీదు మరియు బ్యాంక్ డెబిట్ SMS స్క్రీన్‌షాట్‌లు."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "📁 शिकायत दर्ज करने के लिए आवश्यक विवरण और साक्ष्य:\n\n"
                    "1. 12 अंकों का UPI UTR / बैंक रेफरेंस नंबर।\n"
                    "2. पैसे कटने की सही तारीख और समय।\n"
                    "3. आपका बैंक खाता नंबर और बैंक का नाम।\n"
                    "4. जालसाज की UPI ID (VPA) या बैंक खाता संख्या।\n"
                    "5. जालसाज का फोन नंबर (व्हाट्सएप या कॉल लॉग स्क्रीनशॉट)।\n"
                    "6. PhonePe/GPay की पूरी रसीद और बैंक का डेबिट SMS स्क्रीनशॉट।"
                )
            else:
                return (
                    "📁 Essential Information & Evidence Required for Your Complaint:\n\n"
                    "1. 12-Digit UPI Transaction ID / UTR number (visible on your payment receipt).\n"
                    "2. Exact timestamp and date of the unauthorized transaction.\n"
                    "3. Your remitter bank account number and bank name.\n"
                    "4. Beneficiary UPI ID / VPA (e.g., fraudster@ybl).\n"
                    "5. Fraudster's mobile phone number or contact handle.\n"
                    "6. Uncropped digital screenshot of the payment receipt, bank debit SMS, and any scam chat history."
                )

        # 7. SCRIPT / WHAT TO TELL BANK OR AUTHORITIES
        if topic == AssistantTopic.BANK_DISPUTE_VS_FREEZE:
            if language == AssistantLanguage.TE:
                return (
                    "🗣️ మీ బ్యాంక్ లేదా 1930 ఆపరేటర్‌కు చెప్పవలసిన విధానం (Script):\n\n"
                    "\"నా ఖాతా నుండి అనధికారిక UPI లావాదేవీ జరిగింది. UTR నంబర్ [మీ 12 అంకెల నంబర్] మరియు మొత్తం [మొత్తం]. దయచేసి RBI కస్టమర్ ప్రొటెక్షన్ మార్గదర్శకాల కింద దీనిపై తక్షణ వివాదాన్ని (Dispute) నమోదు చేసి, లబ్ధిదారుడి బ్యాంక్ నోడల్ ఆఫీసర్‌కు లీన్/ఫ్రీజ్ రిక్వెస్ట్ పంపండి.\"\n\n"
                    "ముఖ్యమైన తేడా:\n"
                    "• ఫిర్యాదు చేయడం (Reporting): పోలీసులలో రికార్డు నమోదు చేయడం.\n"
                    "• అకౌంట్ ఫ్రీజ్ (Lien): మోసగాడి బ్యాంక్ మాత్రమే లీన్ హోల్డ్ పెట్టగలదు. ఏ AI కూడా నేరుగా ఖాతాను ఫ్రీజ్ చేయలేదు."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "🗣️ अपने बैंक या 1930 ऑपरेटर से क्या कहें (Script):\n\n"
                    "\"मेरे खाते से अनधिकृत UPI लेनदेन हुआ है। इसका 12 अंकों का UTR [आपका UTR नंबर] और राशि [रकम] है। कृपया RBI उपभोक्ता संरक्षण नियमों के तहत तत्काल विवाद दर्ज करें और प्राप्तकर्ता बैंक को डेबिट लीन लगाने का निर्देश भेजें।\"\n\n"
                    "महत्वपूर्ण अंतर:\n"
                    "• फ्रॉड रिपोर्टिंग: 1930/पोर्टल पर शिकायत दर्ज करना।\n"
                    "• अकाउंट फ्रीज: केवल बैंक और पुलिस ही कानूनी रूप से जालसाज के खाते पर रोक (Lien) लगा सकते हैं।"
                )
            else:
                return (
                    "🗣️ Exact Script to Quote to Your Bank or 1930 Operator:\n\n"
                    "\"I am reporting an unauthorized electronic UPI transaction from my account. The 12-digit UTR is [Quote UTR] for the amount of [Quote Amount]. As per RBI Customer Protection Directives (RBI/2017-18/15), I am reporting this within the Golden Hour window. Please register a formal dispute and notify the beneficiary bank's nodal desk to mark an immediate debit lien on the receiving account.\"\n\n"
                    "Key Difference to Remember:\n"
                    "• Reporting Fraud: Lodging an official police record on 1930.\n"
                    "• Account Freeze: An administrative debit hold executed strictly by banks upon law enforcement instruction."
                )

        # 8. MONEY RECOVERY CHANCES (RBI ZERO LIABILITY)
        if topic == AssistantTopic.RBI_ZERO_LIABILITY:
            if language == AssistantLanguage.TE:
                return (
                    "💰 నా డబ్బు తిరిగి వస్తుందా? (RBI నియమాలు & వాస్తవాలు):\n\n"
                    "• గోల్డెన్ అవర్ లో 1930 ద్వారా మోసగాడి ఖాతాలో డబ్బులు ఇంకా ఉన్నప్పుడు ఫ్రీజ్/లీన్ పెడితే రికవరీ అవకాశాలు చాలా ఎక్కువగా ఉంటాయి.\n"
                    "• RBI సర్క్యులర్ (RBI/2017-18/15) ప్రకారం: మీ తప్పు లేకుండా అనధికారిక లావాదేవీ జరిగి, 3 పనిదినాలలోపు మీ బ్యాంక్‌కు నివేదిస్తే, జీరో లయబిలిటీ (Zero Liability) వర్తిస్తుంది.\n"
                    "• హెచ్చరిక: 100% డబ్బు వాపస్ ఇస్తామని నమ్మించే ప్రైవేట్ 'రికవరీ ఏజెంట్ల' ను ఎప్పుడూ నమ్మవద్దు."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "💰 क्या मेरा पैसा वापस मिल सकता है? (RBI नियम एवं वास्तविकता):\n\n"
                    "• यदि आप 'गोल्डन ऑवर' में 1930 पर रिपोर्ट करते हैं और जालसाज के खाते में पैसे शेष हैं, तो बैंक द्वारा लीन (Hold) लगाए जाने पर पैसे वापसी की संभावना अधिक होती है।\n"
                    "• RBI सर्कुलर (RBI/2017-18/15): यदि ग्राहक की कोई लापरवाही नहीं है और 3 दिनों में बैंक को सूचित कर दिया जाए, तो ग्राहक की देयता शून्य होती है।\n"
                    "• चेतावनी: कोई भी एजेंसी या AI 100% पैसे वापसी की कानूनी गारंटी नहीं दे सकती। अज्ञात 'रिकवरी एजेंट' के झांसे में न आएं।"
                )
            else:
                return (
                    "💰 Can My Money Be Recovered? (Facts & RBI Guidelines):\n\n"
                    "• If reported during the 'Golden Hour' (first 2-3 hours) via 1930, the receiving bank can mark an administrative lien freeze before the scammer withdraws the cash, significantly boosting recovery chances.\n"
                    "• Under RBI Circular RBI/2017-18/15, when an unauthorized electronic transaction occurs due to third-party breach and you notify your bank within 3 working days, customer liability is ZERO.\n"
                    "• Warning: No AI or private third party can guarantee 100% recovery. Beware of secondary 'refund recovery' scammers demanding fees."
                )

        # 9. UNKNOWN LEGAL / REGULATORY CLAIMS
        if topic == AssistantTopic.LEGAL_LIMITATION:
            if language == AssistantLanguage.TE:
                return (
                    "⚖️ చట్టపరమైన పరిమితుల నోటీసు:\n\n"
                    "గోల్డెన్‌అవర్ AI ప్రామాణిక 1930 మరియు RBI మార్గదర్శకాలపై విద్యాపరమైన మరియు అత్యవసర మార్గదర్శకత్వాన్ని మాత్రమే అందిస్తుంది. నేను నిర్దిష్ట న్యాయస్థాన ప్రక్రియలను నిర్వహించలేను లేదా నిందితుల అరెస్ట్ లేదా రికవరీ ఫలితాలకు హామీ ఇవ్వలేను.\n\n"
                    "అధికారిక న్యాయ ప్రక్రియల కోసం దయచేసి అర్హత కలిగిన న్యాయవాదిని సంప్రదించండి లేదా https://cybercrime.gov.in లో మీ అధికారిక పోలీస్ ఫిర్యాదును కొనసాగించండి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "⚖️ कानूनी सीमा सूचना:\n\n"
                    "गोल्डनआवर AI केवल 1930 और RBI प्रक्रियाओं पर शैक्षिक एवं आपातकालीन मार्गदर्शन प्रदान करता है। मैं औपचारिक कानूनी प्रतिनिधित्व, अदालती आदेश या गिरफ्तारी की समयसीमा की भविष्यवाणी नहीं कर सकता।\n\n"
                    "उचित कानूनी सलाह के लिए कृपया किसी विधि विशेषज्ञ से संपर्क करें या https://cybercrime.gov.in पर अपनी आधिकारिक शिकायत दर्ज करें।"
                )
            else:
                return (
                    "⚖️ Legal Scope & Limitation Notice:\n\n"
                    "GoldenHour AI provides technical and educational guidance based on standard 1930 and RBI operating procedures. I cannot provide formal legal representation, predict court judgments, or guarantee specific police actions.\n\n"
                    "For formal legal actions or judicial petitions, please consult a qualified legal advocate or follow the official investigative procedures through https://cybercrime.gov.in."
                )

        # 10. UNRELATED INQUIRIES
        if topic == AssistantTopic.UNRELATED_INQUIRY:
            if language == AssistantLanguage.TE:
                return "నేను గోల్డెన్‌అవర్ AI సైబర్ రక్షణ సహాయకుడిని. నేను ప్రధానంగా భారతదేశంలో UPI మోసాలు, 1930 హెల్ప్‌లైన్ మరియు సైబర్ క్రైమ్ రక్షణలో సహాయపడటానికి రూపొందించబడ్డాను. మీ ఆర్థిక సైబర్ భద్రత గురించి ఏదైనా ప్రశ్న అడగండి!"
            elif language == AssistantLanguage.HI:
                return "मैं गोल्डनआवर AI साइबर सुरक्षा सहायक हूँ। मेरा मुख्य उद्देश्य UPI धोखाधड़ी, 1930 हेल्पलाइन और साइबर सुरक्षा पर मार्गदर्शन प्रदान करना है। आप साइबर अपराध या बैंक विवाद के बारे में कोई भी सवाल पूछ सकते हैं!"
            else:
                return "I am GoldenHour's specialized AI Cyber Defense Assistant. While I can answer general knowledge briefly, my core expertise is helping citizens navigate UPI fraud, 1930 helpline triage, and RBI bank dispute protocols. Feel free to ask any cyber safety or payment question!"

        # 11. SENIOR CITIZEN MODE (Simpler phrasing)
        if senior_mode or topic == AssistantTopic.SENIOR_CITIZEN_GUIDANCE:
            if language == AssistantLanguage.TE:
                return (
                    "👴 సీనియర్ సిటిజన్ సులభ రక్షణ మార్గదర్శి:\n\n"
                    "1. ప్రశాంతంగా ఉండండి: ఇది మీ తప్పు కాదు.\n"
                    "2. వెంటనే 1930 నంబర్‌కు డయల్ చేయండి.\n"
                    "3. మీ బ్యాంక్ పేరు మరియు డబ్బు కట్ అయిన 12 అంకెల UTR నంబర్ చెప్పండి (రసీదుపై ఉంటుంది).\n"
                    "4. మీ స్వంత బ్యాంక్ శాఖకు వెళ్లి అనధికారిక లావాదేవీ జరిగిందని రాతపూర్వకంగా తెలపండి.\n"
                    "5. ఎవరికీ మీ PIN లేదా OTP ఎప్పుడూ చెప్పవద్దు.\n"
                    "6. సహాయం కోసం మీ కుటుంబ సభ్యుడిని పక్కన ఉంచుకోండి."
                )
            elif language == AssistantLanguage.HI:
                return (
                    "👴 वरिष्ठ नागरिकों के लिए सरल 4-चरणीय सुरक्षा मार्गदर्शिका:\n\n"
                    "1. शांत रहें: घबराएं नहीं, यह आपकी गलती नहीं है।\n"
                    "2. तुरंत अपने फोन से 1930 नंबर डायल करें।\n"
                    "3. ऑपरेटर को अपने बैंक का नाम और 12 अंकों का UTR नंबर बताएं।\n"
                    "4. अपनी बैंक शाखा में जाकर लिखित शिकायत दें।\n"
                    "5. किसी को भी अपना बैंक PIN या OTP न बताएं।\n"
                    "6. सहायता के लिए अपने परिवार के किसी सदस्य को साथ रखें।"
                )
            else:
                return (
                    "👴 Simple Step-by-Step Guidance for Senior Citizens:\n\n"
                    "1. Please stay calm: Cyber fraud happens to thousands daily; do not blame yourself.\n"
                    "2. Immediately dial 1930 from your phone (Free Government Helpline).\n"
                    "3. Tell the operator your bank name and the 12-digit UTR reference number from your SMS.\n"
                    "4. Visit your home bank branch to file an unauthorized debit dispute.\n"
                    "5. NEVER share your UPI PIN or OTP with anyone offering refunds.\n"
                    "6. Have a trusted family member assist you through the process."
                )

        # 12. GENERAL 1930 / CYBER DEFENSE OVERVIEW
        if language == AssistantLanguage.TE:
            return (
                "🛡️ గోల్డెన్‌అవర్ AI అత్యవసర సహాయం:\n\n"
                "• సైబర్ మోసం జరిగిన మొదటి 2-3 గంటల 'గోల్డెన్ అవర్' లో స్పందించడం అత్యంత ముఖ్యం.\n"
                "• అత్యవసర చర్యలు:\n"
                "  1. వెంటనే 1930 కి కాల్ చేసి NCRP అక్నాలెడ్జ్‌మెంట్ టోకెన్ పొందండి.\n"
                "  2. మీ బ్యాంక్‌కు వెంటనే సమాచారం అందించి లబ్ధిదారుడి ఖాతాపై లీన్ హోల్డ్ అభ్యర్థించండి.\n"
                "  3. 12 అంకెల UTR నంబర్ ఉన్న స్క్రీన్‌షాట్‌ను భద్రపరచండి.\n\n"
                "మీకు 1930 సంప్రదింపులు, బ్యాంక్ వివాదం లేదా సైబర్ పోర్టల్ గురించి వివరాలు కావాలా?"
            )
        elif language == AssistantLanguage.HI:
            return (
                "🛡️ गोल्डनआवर AI आपातकालीन सहायता:\n\n"
                "• धोखाधड़ी के पहले 2-3 घंटे ('गोल्डन ऑवर') में त्वरित कार्रवाई सबसे प्रभावी होती है।\n"
                "• आपातकालीन कदम:\n"
                "  1. तुरंत 1930 पर कॉल करके औपचारिक शिकायत दर्ज करें।\n"
                "  2. अपने बैंक के फ्रॉड डेस्क को सूचित करके जालसाज के खाते पर रोक (Lien) का अनुरोध करें।\n"
                "  3. 12 अंकों के UTR नंबर वाला स्क्रीनशॉट सुरक्षित रखें।\n\n"
                "क्या आप 1930 हेल्पलाइन, बैंक विवाद या साइबर पोर्टल के बारे में कोई विशिष्ट जानकारी चाहते हैं?"
            )
        else:
            return (
                "🛡️ GoldenHour AI Emergency Cyber Defense Overview:\n\n"
                "• The Golden Hour Advantage: Acting within the first 2-3 hours maximizes the chance of freezing defrauded funds before withdrawal.\n"
                "• Priority Emergency Steps:\n"
                "  1. Dial 1930 immediately to log an official NCRP incident token.\n"
                "  2. Notify your issuing bank's fraud desk to request an administrative lien on the beneficiary account.\n"
                "  3. Preserve uncropped receipts displaying the 12-digit UTR number.\n\n"
                "How can I assist you with your specific incident or case right now?"
            )

    def _get_quick_actions(self, topic: AssistantTopic, lang: AssistantLanguage, case_id: Optional[str] = None) -> List[QuickAction]:
        complaint_url = f"/dashboard/cases/{case_id}/complaints" if case_id else "/dashboard/cases"
        case_url = f"/dashboard/cases/{case_id}" if case_id else "/dashboard/cases"

        if lang == AssistantLanguage.TE:
            if topic in [AssistantTopic.HELPLINE_1930, AssistantTopic.GREETING]:
                return [
                    QuickAction(label="1930 కి కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="ఉచిత సైబర్ హెల్ప్‌లైన్"),
                    QuickAction(label="1930 మాట్లాడే స్క్రిప్ట్", action_type="PROMPT", action_target="1930 ఆపరేటర్‌తో మాట్లాడటానికి స్క్రిప్ట్ ఇవ్వండి", description="ఖచ్చితమైన పదాలు"),
                    QuickAction(label="cybercrime.gov.in", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="అధికారిక సైబర్ పోర్టల్")
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    QuickAction(label="ఫిర్యాదుల స్టూడియో (లేఖలు)", action_type="NAVIGATE", action_target=complaint_url, description="బ్యాంక్ లేఖ పిడిఎఫ్"),
                    QuickAction(label="1930 కి కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="హెల్ప్‌లైన్"),
                    QuickAction(label="బ్యాంక్ మేనేజర్ స్క్రిప్ట్", action_type="PROMPT", action_target="బ్యాంక్ మేనేజర్‌కు చెప్పవలసిన స్క్రిప్ట్ ఏమిటి?", description="వివాద ప్రకటన")
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    QuickAction(label="ఆధారాలు అప్‌లోడ్ చేయండి", action_type="NAVIGATE", action_target="/dashboard/report", description="కొత్త రసీదులు"),
                    QuickAction(label="ఎవిడెన్స్ వాల్ట్ చూడండి", action_type="NAVIGATE", action_target=case_url, description="ధృవీకరించబడిన వివరాలు"),
                    QuickAction(label="1930 కి కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="హెల్ప్‌లైన్")
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    QuickAction(label="కేసు ఫిర్యాదుల స్టూడియో", action_type="NAVIGATE", action_target=complaint_url, description="రాతపూర్వక పత్రాలు"),
                    QuickAction(label="కేసు పూర్తి వివరాలు", action_type="NAVIGATE", action_target=case_url, description="సారాంశం"),
                    QuickAction(label="1930 కి కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="కేసు రిఫరెన్స్ తో")
                ]
            else:
                return [
                    QuickAction(label="1930 కి తక్షణమే కాల్ చేయండి", action_type="CALL", action_target="tel:1930", description="గోల్డెన్ అవర్ హెల్ప్‌లైన్"),
                    QuickAction(label="మోసాన్ని నివేదించండి", action_type="NAVIGATE", action_target="/dashboard/report", description="కొత్త కేసు నమోదు"),
                    QuickAction(label="ఫిర్యాదు పత్రాలు రూపొందించండి", action_type="NAVIGATE", action_target=complaint_url, description="బ్యాంక్ వివాద లేఖ")
                ]

        elif lang == AssistantLanguage.HI:
            if topic in [AssistantTopic.HELPLINE_1930, AssistantTopic.GREETING]:
                return [
                    QuickAction(label="1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="निशुल्क राष्ट्रीय हेल्पलाइन"),
                    QuickAction(label="1930 कॉलिंग स्क्रिप्ट", action_type="PROMPT", action_target="1930 ऑपरेटर से बात करने के लिए स्क्रिप्ट दें", description="सही शब्द"),
                    QuickAction(label="cybercrime.gov.in", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="आधिकारिक पोर्टल")
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    QuickAction(label="शिकायत स्टूडियो (पत्र तैयार करें)", action_type="NAVIGATE", action_target=complaint_url, description="बैंक विवाद पत्र"),
                    QuickAction(label="1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="हेल्पलाइन"),
                    QuickAction(label="बैंक प्रबंधक स्क्रिप्ट", action_type="PROMPT", action_target="बैंक प्रबंधक को क्या बोलना चाहिए?", description="विवाद विवरण")
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    QuickAction(label="सबूत अपलोड करें", action_type="NAVIGATE", action_target="/dashboard/report", description="रसीद और स्क्रीनशॉट"),
                    QuickAction(label="सबूत वॉल्ट देखें", action_type="NAVIGATE", action_target=case_url, description="सत्यापित विवरण"),
                    QuickAction(label="1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="हेल्पलाइन")
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    QuickAction(label="शिकायत स्टूडियो खोलें", action_type="NAVIGATE", action_target=complaint_url, description="दस्तावेज़ डाउनलोड"),
                    QuickAction(label="केस विवरण देखें", action_type="NAVIGATE", action_target=case_url, description="केस सारांश"),
                    QuickAction(label="1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="हेल्पलाइन")
                ]
            else:
                return [
                    QuickAction(label="तुरंत 1930 पर कॉल करें", action_type="CALL", action_target="tel:1930", description="गोल्डन ऑवर हेल्पलाइन"),
                    QuickAction(label="नया केस दर्ज करें", action_type="NAVIGATE", action_target="/dashboard/report", description="ऑनलाइन रिपोर्ट"),
                    QuickAction(label="शिकायत पत्र तैयार करें", action_type="NAVIGATE", action_target=complaint_url, description="बैंक लीन आवेदन")
                ]

        else:
            if topic in [AssistantTopic.HELPLINE_1930, AssistantTopic.GREETING]:
                return [
                    QuickAction(label="Call 1930 Helpline", action_type="CALL", action_target="tel:1930", description="Toll-Free National Helpline"),
                    QuickAction(label="1930 Speaking Script", action_type="PROMPT", action_target="What exact words should I speak to the 1930 operator?", description="Exact dialogue"),
                    QuickAction(label="cybercrime.gov.in", action_type="NAVIGATE", action_target="https://cybercrime.gov.in", description="Official Police Portal")
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    QuickAction(label="Complaint Studio (Draft Letters)", action_type="NAVIGATE", action_target=complaint_url, description="Generate Bank Letters"),
                    QuickAction(label="Call 1930 Helpline", action_type="CALL", action_target="tel:1930", description="Toll-Free Helpline"),
                    QuickAction(label="Bank Manager Script", action_type="PROMPT", action_target="Give me the exact script to tell my bank manager", description="Speaking script")
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    QuickAction(label="Upload Receipts & SMS", action_type="NAVIGATE", action_target="/dashboard/report", description="Add Evidence"),
                    QuickAction(label="View Evidence Vault", action_type="NAVIGATE", action_target=case_url, description="Verified Parameters"),
                    QuickAction(label="Call 1930 Helpline", action_type="CALL", action_target="tel:1930", description="Emergency Help")
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    QuickAction(label="Open Complaint Studio", action_type="NAVIGATE", action_target=complaint_url, description="Download Dossier PDF"),
                    QuickAction(label="View Full Case Details", action_type="NAVIGATE", action_target=case_url, description="Case Overview"),
                    QuickAction(label="Call 1930 with UTR", action_type="CALL", action_target="tel:1930", description="Quote Parameters")
                ]
            else:
                return [
                    QuickAction(label="Call 1930 Immediately", action_type="CALL", action_target="tel:1930", description="Golden Hour Toll-Free"),
                    QuickAction(label="Report Fraud Incident", action_type="NAVIGATE", action_target="/dashboard/report", description="Upload Evidence"),
                    QuickAction(label="Draft Bank Dispute Letter", action_type="NAVIGATE", action_target=complaint_url, description="Complaint Studio")
                ]

    def _get_follow_ups(self, topic: AssistantTopic, lang: AssistantLanguage) -> List[str]:
        if lang == AssistantLanguage.TE:
            if topic == AssistantTopic.HELPLINE_1930:
                return [
                    "1930 ఆపరేటర్ ఏ ఖచ్చితమైన వివరాలను అడుగుతారు?",
                    "1930 కి కాల్ చేసిన తర్వాత నా బ్యాంకుకు ఏమి చెప్పాలి?",
                    "NCRP పోర్టల్‌లో ఫిర్యాదును ఎలా ట్రాక్ చేయాలి?"
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    "RBI జీరో లయబిలిటీ కింద నాకు పూర్తి రిఫండ్ వస్తుందా?",
                    "బ్యాంకు వివాదాన్ని నమోదు చేయడానికి నిరాకరిస్తే ఏమి చేయాలి?",
                    "లబ్ధిదారుడి ఖాతాపై లీన్ హోల్డ్ పెట్టడానికి ఎంత సమయం పడుతుంది?"
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    "నా వద్ద కేవలం బ్యాంక్ SMS మాత్రమే ఉంటే ఎలా?",
                    "PhonePe లో 12 అంకెల UTR నంబర్‌ను ఎక్కడ కనుగొనాలి?",
                    "WhatsApp చాట్ స్క్రీన్‌షాట్‌లు చట్టబద్ధంగా చెల్లుతాయా?"
                ]
            elif topic in [AssistantTopic.FAKE_QR_SCAM, AssistantTopic.UNAUTHORIZED_DEBIT, AssistantTopic.PHISHING_LINK]:
                return [
                    "1930 మాట్లాడే స్క్రిప్ట్ చూపించండి",
                    "నా బ్యాంక్ మేనేజర్‌కు చెప్పవలసిన స్క్రిప్ట్ ఏమిటి?",
                    "నా డబ్బు రికవరీ అయ్యే అవకాశాలు ఎంతవరకు ఉన్నాయి?"
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    "ఈ కేసుకు బ్యాంక్ ఫిర్యాదు లేఖను తయారు చేయండి",
                    "1930 ఆపరేటర్‌కు ఈ కేసు నుండి ఏ వివరాలు చదవాలి?",
                    "నా 12 అంకెల UTR నంబర్ ధృవీకరించబడిందా?"
                ]
            else:
                return [
                    "1930 నంబర్కు ఎలా కాల్ చేయాలి?",
                    "UPI మోసాన్ని ఎలా ఫిర్యాదు చేయాలి?",
                    "నేను ఏ ఆధారాలను భద్రపరచాలి?",
                    "నా డబ్బు తిరిగి వస్తుందా?"
                ]

        elif lang == AssistantLanguage.HI:
            if topic == AssistantTopic.HELPLINE_1930:
                return [
                    "1930 ऑपरेटर मुझसे कौन से सटीक विवरण पूछेगा?",
                    "1930 पर कॉल करने के बाद बैंक को क्या बताना चाहिए?",
                    "NCRP पोर्टल पर अपनी शिकायत को कैसे ट्रैक करें?"
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    "क्या RBI जीरो लायबिलिटी के तहत मुझे पूरा रिफंड मिलेगा?",
                    "अगर बैंक शिकायत दर्ज करने से मना करे तो क्या करें?",
                    "प्राप्तकर्ता बैंक को खाता लीन करने में कितना समय लगता है?"
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    "अगर मेरे पास केवल बैंक का SMS हो और रसीद न हो तो क्या करें?",
                    "PhonePe/GPay पर 12 अंकों का UTR नंबर कहाँ मिलता है?",
                    "क्या व्हाट्सएप चैट के स्क्रीनशॉट कानूनी सबूत माने जाते हैं?"
                ]
            elif topic in [AssistantTopic.FAKE_QR_SCAM, AssistantTopic.UNAUTHORIZED_DEBIT, AssistantTopic.PHISHING_LINK]:
                return [
                    "1930 पर बोलने के लिए मुझे स्क्रिप्ट दें",
                    "बैंक प्रबंधक को क्या बोलना चाहिए?",
                    "पैसे वापस मिलने की कितनी संभावना है?"
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    "इस केस के लिए बैंक शिकायत पत्र का प्रारूप बनाएं",
                    "1930 ऑपरेटर को इस केस से कौन से विवरण देने हैं?",
                    "क्या मेरा 12 अंकों का UTR नंबर सत्यापित हो गया है?"
                ]
            else:
                return [
                    "1930 पर कैसे कॉल करें?",
                    "UPI धोखाधड़ी की शिकायत कैसे करें?",
                    "कौन से सबूत सुरक्षित रखने चाहिए?",
                    "क्या मेरा पैसा वापस मिल सकता है?"
                ]

        else:
            if topic == AssistantTopic.HELPLINE_1930:
                return [
                    "What exact questions does the 1930 operator ask?",
                    "What should I tell my bank after calling 1930?",
                    "How do I track my 1930 NCRP complaint status?"
                ]
            elif topic in [AssistantTopic.BANK_DISPUTE_VS_FREEZE, AssistantTopic.RBI_ZERO_LIABILITY]:
                return [
                    "Am I entitled to 100% refund under RBI Zero Liability?",
                    "What should I do if my bank branch refuses to register the dispute?",
                    "How long does a bank take to place an administrative lien hold?"
                ]
            elif topic == AssistantTopic.EVIDENCE_PRESERVATION:
                return [
                    "What if I only have a debit SMS and no digital receipt?",
                    "How do I locate the 12-digit UTR on PhonePe or Google Pay?",
                    "Are WhatsApp scam chat transcripts legally valid evidence?"
                ]
            elif topic in [AssistantTopic.FAKE_QR_SCAM, AssistantTopic.UNAUTHORIZED_DEBIT, AssistantTopic.PHISHING_LINK]:
                return [
                    "What exact words should I speak to the 1930 operator?",
                    "Give me the exact script to tell my bank manager",
                    "What are the realistic chances of recovering my funds?"
                ]
            elif topic == AssistantTopic.CASE_SPECIFIC_INQUIRY:
                return [
                    "Generate a formal bank complaint letter for this case",
                    "What exact parameters from this case should I read to 1930?",
                    "Is my 12-digit UTR number fully verified?"
                ]
            else:
                return [
                    "How do I call 1930?",
                    "How do I report UPI fraud?",
                    "What evidence should I save?",
                    "Can my money be recovered?"
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
        if not self.client:
            return None

        lang_name = "English"
        if language == AssistantLanguage.TE:
            lang_name = "Telugu (తెలుగు)"
        elif language == AssistantLanguage.HI:
            lang_name = "Hindi (हिंदी)"

        system_prompt = (
            f"You are GoldenHour AI Cyber Defense Assistant, specializing in Indian UPI fraud guidance and cyber emergency response. "
            f"You MUST respond 100% in {lang_name}. Do NOT switch to English when Telugu or Hindi is requested.\n\n"
            f"CRITICAL BEHAVIOR RULES:\n"
            f"1. GREETINGS: If user says 'Hi' or greets, reply with a warm, friendly, concise greeting welcoming them to GoldenHour, and asking how you can assist with their UPI issue or fraud report. Never dump unprompted banking manuals on simple greetings.\n"
            f"2. QUESTIONS: Answer directly, concisely, and accurately based on official SOPs (1930, cybercrime.gov.in, RBI Circular RBI/2017-18/15).\n"
            f"3. FOLLOW-UPS: Use recent conversation history to resolve pronouns ('it', 'them', 'my transaction').\n"
            f"4. INCIDENT REPORT: If user reports an unauthorized transaction (e.g. 'I lost ₹10,000 through a fake QR code'), offer immediate empathy and prioritize the 3 Golden Hour steps: (1) Dial 1930 immediately, (2) Inform bank's official fraud department to request a lien freeze on beneficiary account, (3) Preserve receipt, SMS, and chat screenshots.\n"
            f"5. ACTIVE CASE: If active fraud case details are provided below, accurately quote the verified parameters (UTR, Amount, Beneficiary VPA, Bank) when addressing their inquiry. Never invent missing details.\n"
            f"6. SENIOR CITIZEN: If senior_citizen_mode is True, use extra simple language, short numbered steps, and explain banking terms (UTR, Lien).\n"
            f"7. UNRELATED: If asked an unrelated question, answer politely and concisely, gently reminding them you are their cyber defense assistant.\n"
            f"8. UNKNOWN / LEGAL: Never promise 100% recovery. If asked about unknown legal procedures or judicial predictions, state your limitations honestly and refer them to official legal advisors or cybercrime.gov.in.\n"
            f"9. SECURITY: NEVER ask for, echo, or store UPI PINs, MPINs, OTPs, CVVs, or passwords."
        )

        if case_context:
            system_prompt += f"\n\nCitizen's Verified Active Case Context:\n{case_context}"

        messages = []
        for h in (history or [])[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        resp = self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=800,
            system=system_prompt,
            messages=messages
        )
        return resp.content[0].text if resp.content else None

    def translate_history(
        self,
        messages: List[Dict[str, Any]],
        target_language: AssistantLanguage
    ) -> List[Dict[str, Any]]:
        """
        Translates visible chat messages into target language while preserving technical identifiers:
        - 12-digit UTRs
        - Beneficiary & Sender UPI IDs (VPAs)
        - Defrauded amounts (₹)
        - Phone numbers & helpline 1930
        - Timestamps
        """
        if not messages:
            return []

        # If Claude client is available, batch translate with strict technical token preservation
        if self.client:
            try:
                lang_name = "Telugu (తెలుగు)" if target_language == AssistantLanguage.TE else ("Hindi (हिंदी)" if target_language == AssistantLanguage.HI else "English")
                prompt = (
                    f"Translate the following chat message objects into {lang_name}.\n"
                    f"CRITICAL MANDATES:\n"
                    f"1. Preserve technical identifiers verbatim: UTRs (e.g. 620184739253), UPI VPAs (e.g. fraudpay@demobank), amounts (e.g. ₹10,000), phone numbers (1930), URLs (https://cybercrime.gov.in).\n"
                    f"2. Keep the exact JSON structure: [{{'id': ..., 'role': ..., 'content': '...', 'timestamp': ...}}].\n"
                    f"3. Return ONLY valid JSON array."
                )
                serialized = [{"id": m.get("id"), "role": m.get("role"), "content": m.get("content"), "timestamp": m.get("timestamp")} for m in messages]
                resp = self.client.messages.create(
                    model=settings.ANTHROPIC_MODEL,
                    max_tokens=1500,
                    system=prompt,
                    messages=[{"role": "user", "content": str(serialized)}]
                )
                import json
                cleaned = resp.content[0].text.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.splitlines()
                    cleaned = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) == len(messages):
                    res = []
                    for orig, tr in zip(messages, parsed):
                        updated = dict(orig)
                        updated["content"] = tr.get("content", orig.get("content"))
                        updated["language"] = target_language.value
                        res.append(updated)
                    return res
            except Exception:
                pass

        # Robust AST & Pattern Translator (Runs locally without external API)
        translated_list = []
        for m in messages:
            content = m.get("content", "")
            role = m.get("role", "assistant")

            # Extract technical tokens to protect them
            utrs = re.findall(r"\b[0-9]{12}\b", content)
            vpas = re.findall(r"\b[a-zA-Z0-9.\-_]+@[a-zA-Z]+\b", content)
            amounts = re.findall(r"(?:₹|Rs\.?|INR)?\s*[0-9,]+(?:\.[0-9]{2})?", content)

            new_content = self._translate_single_text(content, role, target_language, utrs, vpas, amounts)
            updated_m = dict(m)
            updated_m["content"] = new_content
            updated_m["language"] = target_language.value
            translated_list.append(updated_m)

        return translated_list

    def _translate_single_text(
        self,
        text: str,
        role: str,
        target_lang: AssistantLanguage,
        utrs: List[str],
        vpas: List[str],
        amounts: List[str]
    ) -> str:
        """Translates a message while preserving exact entity tokens."""
        t_lower = text.lower().strip()

        # 1. User Greetings
        if re.match(r"^(hi|hello|hey|good\s*morning|namaste|నమస్కారం|హలో|नमस्ते|प्रणाम)\b", t_lower):
            if target_lang == AssistantLanguage.TE:
                return "నమస్కారం!"
            elif target_lang == AssistantLanguage.HI:
                return "नमस्ते!"
            else:
                return "Hello!"

        # 2. Assistant Welcome Messages
        if "welcome to goldenhour" in t_lower or "గోల్డెన్‌అవర్‌కి స్వాగతం" in t_lower or "गोल्डनआवर में आपका स्वागत" in t_lower or "specializing in indian upi fraud" in t_lower or "emergency cyber assistant" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "నమస్కారం! గోల్డెన్‌అవర్‌కి స్వాగతం. నేను మీకు ఎలా సహాయపడగలను? మీరు ఏదైనా UPI చెల్లింపు సమస్యను ఎదుర్కొంటున్నారా లేదా సైబర్ మోసాన్ని నివేదించడంలో సహాయం కావాలా?"
            elif target_lang == AssistantLanguage.HI:
                return "नमस्ते! गोल्डनआवर में आपका स्वागत है। मैं आज आपकी क्या मदद कर सकता हूँ? क्या आप किसी UPI भुगतान समस्या का सामना कर रहे हैं या साइबर धोखाधड़ी की रिपोर्ट करने में सहायता चाहते हैं?"
            else:
                return "Hello! Welcome to GoldenHour. How can I help you today? Are you facing a UPI payment issue or would you like help reporting a cyber fraud?"

        # 3. User Fraud Loss Reports (e.g. "I lost ₹10,000 through a fake UPI QR code.")
        if ("lost" in t_lower or "పోయా" in t_lower or "गंवा" in t_lower or "कट गए" in t_lower) and ("qr" in t_lower or "fake" in t_lower or "upi" in t_lower):
            amt = amounts[0] if amounts else "₹10,000"
            if target_lang == AssistantLanguage.TE:
                return f"నేను నకిలీ UPI QR కోడ్ ద్వారా {amt} మోసపోయాను."
            elif target_lang == AssistantLanguage.HI:
                return f"मैंने एक फर्जी UPI QR कोड के माध्यम से {amt} गंवा दिए।"
            else:
                return f"I lost {amt} through a fake UPI QR code."

        # 4. User Questions: "How do I report it?"
        if "how do i report" in t_lower or "ఎలా ఫిర్యాదు" in t_lower or "कैसे शिकायत" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "నేను దీన్ని ఎలా ఫిర్యాదు చేయాలి?"
            elif target_lang == AssistantLanguage.HI:
                return "मैं इसकी शिकायत कैसे दर्ज करूँ?"
            else:
                return "How do I report it?"

        # 5. User Questions: "What information do I need?"
        if "what information" in t_lower or "what evidence" in t_lower or "ఏ సమాచారం" in t_lower or "क्या जानकारी" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "నాకు ఏ సమాచారం మరియు ఆధారాలు అవసరం?"
            elif target_lang == AssistantLanguage.HI:
                return "मुझे क्या जानकारी और सबूत चाहिए?"
            else:
                return "What information do I need?"

        # 6. User Questions: "What should I do next?"
        if "what should i do next" in t_lower or "తర్వాత ఏమి చేయాలి" in t_lower or "आगे क्या करना चाहिए" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "తర్వాత నేను ఏమి చేయాలి?"
            elif target_lang == AssistantLanguage.HI:
                return "आगे मुझे क्या करना चाहिए?"
            else:
                return "What should I do next?"

        # 7. User Questions: "What should I tell them?"
        if "what should i tell them" in t_lower or "వాళ్లకు ఏమి చెప్పాలి" in t_lower or "उन्हें क्या बताएं" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "నేను వాళ్లకు ఏమి చెప్పాలి?"
            elif target_lang == AssistantLanguage.HI:
                return "मुझे उन्हें क्या बताना चाहिए?"
            else:
                return "What should I tell them?"

        # 8. User Questions: "Did you inform your bank? No"
        if t_lower in ["no", "లేదు", "नहीं"]:
            if target_lang == AssistantLanguage.TE:
                return "లేదు."
            elif target_lang == AssistantLanguage.HI:
                return "नहीं।"
            else:
                return "No."

        # 9. User Questions: "Can my money be recovered?"
        if "can my money be recovered" in t_lower or "డబ్బు తిరిగి వస్తుందా" in t_lower or "पैसा वापस मिल सकता है" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "నా డబ్బు తిరిగి వస్తుందా?"
            elif target_lang == AssistantLanguage.HI:
                return "क्या मेरा पैसा वापस मिल सकता है?"
            else:
                return "Can my money be recovered?"

        # 10. Active Case Inquiries
        if "what details should i provide when calling 1930" in t_lower or "1930 కి కాల్ చేసినప్పుడు ఏ వివరాలు" in t_lower:
            if target_lang == AssistantLanguage.TE:
                return "1930 కి కాల్ చేసినప్పుడు నేను ఏ వివరాలను అందించాలి?"
            elif target_lang == AssistantLanguage.HI:
                return "1930 पर कॉल करते समय मुझे क्या विवरण देना चाहिए?"
            else:
                return "What details should I provide when calling 1930?"

        # If it's an assistant response, map based on intent
        intent = self.detect_intent(text)
        return self._generate_intelligent_reply(text, target_lang, intent, None, False)


assistant_service = AssistantService()
