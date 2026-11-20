import { Language } from "@/types";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.report": "Report a Fraud",
    "nav.cases": "My Cases",
    "nav.assistant": "AI Assistant",
    "nav.emergency": "Emergency & Tracking (M7)",
    "nav.profile": "Profile & Settings",
    "nav.logout": "Log Out",
    "nav.helpline": "Emergency Helpline 1930",

    // Dashboard metrics
    "dash.welcome": "Welcome back",
    "dash.overview": "Fintech Cyber Fraud Defense Overview",
    "dash.total_cases": "Total Fraud Cases",
    "dash.in_preparation": "Cases in Preparation",
    "dash.submitted": "Submitted Complaints",
    "dash.recovered": "Recovered / Lien Staged",
    "dash.active_window": "Active Golden Hour Incidents",

    // Urgent banner
    "banner.golden_hour": "Golden Hour Active",
    "banner.golden_desc": "You have an active incident within the 120-minute window. Inter-bank freeze requests have maximum success rate right now.",
    "banner.action": "Expedite Case",

    // Cases table
    "table.recent_cases": "Recently Created Cases",
    "table.case_id": "Case Number",
    "table.title": "Incident Title",
    "table.category": "Scam Category",
    "table.amount": "Amount",
    "table.status": "Status",
    "table.date": "Date Reported",
    "table.action": "Action",
    "table.empty": "No fraud cases found. If you suspect an unauthorized transaction, report it immediately.",
    "table.filter_all": "All Cases",
    "table.filter_prep": "In Preparation",
    "table.filter_submitted": "Submitted",

    // Auth
    "auth.login_title": "Sign In to GoldenHour",
    "auth.login_subtitle": "Access your rapid fraud reporting & cyber defense dashboard",
    "auth.register_title": "Create Citizen Account",
    "auth.register_subtitle": "Join India's AI-Powered UPI Fraud Defense Network",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.confirm_password": "Confirm Password",
    "auth.full_name": "Full Legal Name",
    "auth.phone": "Mobile Number",
    "auth.bank": "Primary Bank Name",
    "auth.language": "Preferred Language",
    "auth.dont_have_account": "Don't have an account?",
    "auth.already_have_account": "Already have an account?",
    "auth.sign_in": "Sign In",
    "auth.sign_up": "Register",

    // Profile
    "profile.title": "Victim Profile & Security",
    "profile.subtitle": "Manage your contact info, preferred language, and notification alerts",
    "profile.save": "Save Changes",
    "profile.saved_success": "Profile updated successfully",
    "profile.security_notice": "Zero-PIN Security Policy: GoldenHour never asks for or stores UPI PINs, OTPs, or passwords.",
  },
  te: {
    // Navigation (Telugu)
    "nav.dashboard": "డ్యాష్‌బోర్డ్ (Dashboard)",
    "nav.report": "మోసాన్ని నివేదించండి (Report Fraud)",
    "nav.cases": "నా కేసులు (My Cases)",
    "nav.assistant": "AI సహాయకుడు (AI Assistant)",
    "nav.emergency": "అత్యవసర రెస్పాన్స్ & కేస్ ట్రాకింగ్ (M7)",
    "nav.profile": "ప్రొఫైల్ (Profile)",
    "nav.logout": "లాగౌట్ (Logout)",
    "nav.helpline": "హెల్ప్‌లైన్: 1930",

    // Dashboard metrics
    "dash.welcome": "స్వాగతం",
    "dash.overview": "యూపీఐ మోసాల రక్షణ డ్యాష్‌బోర్డ్",
    "dash.total_cases": "మొత్తం మోసపు కేసులు",
    "dash.in_preparation": "సిద్ధమవుతున్న కేసులు",
    "dash.submitted": "సమర్పించిన ఫిర్యాదులు",
    "dash.recovered": "రక్షించబడిన / లీన్ మొత్తం",
    "dash.active_window": "గోల్డెన్ అవర్ క్రియాశీల కేసులు",

    // Urgent banner
    "banner.golden_hour": "గోల్డెన్ అవర్ నడుస్తోంది",
    "banner.golden_desc": "మీకు 120 నిమిషాల వ్యవధిలో క్రియాశీల కేసు ఉంది. ఖాతా ఫ్రీజ్ అభ్యర్థనలకు ఇప్పుడే అత్యధిక విజయావకాశం ఉంది.",
    "banner.action": "వెంటనే చర్య తీసుకోండి",

    // Cases table
    "table.recent_cases": "ఇటీవలి మోసపు కేసులు",
    "table.case_id": "కేసు నంబరు",
    "table.title": "కేసు వివరాలు",
    "table.category": "మోసం రకం",
    "table.amount": "మొత్తం",
    "table.status": "స్థితి",
    "table.date": "తేదీ",
    "table.action": "చర్య",
    "table.empty": "ఏ కేసులూ లేవు. మోసపూరిత లావాదేవీ జరిగితే వెంటనే నివేదించండి.",
    "table.filter_all": "అన్ని కేసులు",
    "table.filter_prep": "సిద్ధమవుతున్నవి",
    "table.filter_submitted": "సమర్పించినవి",

    // Auth
    "auth.login_title": "గోల్డెన్ అవర్‌లోకి లాగిన్ అవ్వండి",
    "auth.login_subtitle": "యూపీఐ మోసాల రక్షణ కోసం మీ ఖాతాను తెరవండి",
    "auth.register_title": "కొత్త ఖాతా తెరవండి",
    "auth.register_subtitle": "గోల్డెన్ అవర్ రక్షణ నెట్‌వర్క్‌లో చేరండి",
    "auth.email": "ఈమెయిల్ చిరునామా",
    "auth.password": "పాస్‌వర్డ్",
    "auth.confirm_password": "పాస్‌వర్డ్‌ను నిర్ధారించండి",
    "auth.full_name": "పూర్తి పేరు",
    "auth.phone": "మొబైల్ నంబరు",
    "auth.bank": "మీ బ్యాంకు పేరు",
    "auth.language": "భాష ఎంపిక",
    "auth.dont_have_account": "ఖాతా లేదా?",
    "auth.already_have_account": "ఇప్పటికే ఖాతా ఉందా?",
    "auth.sign_in": "లాగిన్",
    "auth.sign_up": "నమోదు చేయండి",

    // Profile
    "profile.title": "ప్రొఫైల్ మరియు భద్రత",
    "profile.subtitle": "మీ సమాచారం, భాష ప్రాధాన్యత మరియు నోటిఫికేషన్లను నిర్వహించండి",
    "profile.save": "మార్పులను సేవ్ చేయండి",
    "profile.saved_success": "ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది",
    "profile.security_notice": "జీరో-పిన్ రక్షణ: గోల్డెన్ అవర్ ఎప్పుడూ మీ యూపీఐ పిన్ లేదా ఓటీపీని అడగదు.",
  },
  hi: {
    // Navigation (Hindi)
    "nav.dashboard": "डैशबोर्ड (Dashboard)",
    "nav.report": "धोखाधड़ी की रिपोर्ट करें",
    "nav.cases": "मेरे मामले (My Cases)",
    "nav.assistant": "एआई सहायक (AI Assistant)",
    "nav.emergency": "आपातकालीन प्रतिक्रिया एवं केस ट्रैकिंग (M7)",
    "nav.profile": "प्रोफ़ाइल एवं सेटिंग्स",
    "nav.logout": "लॉग आउट",
    "nav.helpline": "साइबर हेल्पलाइन: 1930",

    // Dashboard metrics
    "dash.welcome": "स्वागत है",
    "dash.overview": "यूपीआई फ्रॉड सुरक्षा डैशबोर्ड",
    "dash.total_cases": "कुल धोखाधड़ी मामले",
    "dash.in_preparation": "तैयारी में मामले",
    "dash.submitted": "दर्ज शिकायतें",
    "dash.recovered": "सकुशल रोकी गई राशि",
    "dash.active_window": "गोल्डन ऑवर सक्रिय मामले",

    // Urgent banner
    "banner.golden_hour": "गोल्डन ऑवर विंडो सक्रिय है",
    "banner.golden_desc": "आपके पास 120 मिनट के भीतर एक सक्रिय मामला है। बैंक खाता फ्रीज करने के लिए तुरंत 1930 पर संपर्क करें।",
    "banner.action": "तुरंत कार्रवाई करें",

    // Cases table
    "table.recent_cases": "हाल के धोखाधड़ी मामले",
    "table.case_id": "केस संख्या",
    "table.title": "घटना विवरण",
    "table.category": "धोखाधड़ी श्रेणी",
    "table.amount": "राशि",
    "table.status": "स्थिति",
    "table.date": "रिपोर्ट तिथि",
    "table.action": "कार्रवाई",
    "table.empty": "कोई मामला नहीं मिला। संदिग्ध लेनदेन होने पर तुरंत रिपोर्ट करें।",
    "table.filter_all": "सभी मामले",
    "table.filter_prep": "तैयारी में",
    "table.filter_submitted": "दर्ज की गई",

    // Auth
    "auth.login_title": "गोल्डन ऑवर में लॉगिन करें",
    "auth.login_subtitle": "अपनी आपातकालीन रिपोर्टिंग और सुरक्षा डैशबोर्ड तक पहुंचें",
    "auth.register_title": "नया नागरिक खाता बनाएं",
    "auth.register_subtitle": "यूपीआई साइबर सुरक्षा नेटवर्क से जुड़ें",
    "auth.email": "ईमेल पता",
    "auth.password": "पासवर्ड",
    "auth.confirm_password": "पासवर्ड की पुष्टि करें",
    "auth.full_name": "पूरा नाम",
    "auth.phone": "मोबाइल नंबर",
    "auth.bank": "प्राथमिक बैंक का नाम",
    "auth.language": "पसंदीदा भाषा",
    "auth.dont_have_account": "खाता नहीं है?",
    "auth.already_have_account": "पहले से खाता है?",
    "auth.sign_in": "लॉग इन करें",
    "auth.sign_up": "पंजीकरण करें",

    // Profile
    "profile.title": "नागरिक प्रोफ़ाइल एवं सुरक्षा",
    "profile.subtitle": "अपनी संपर्क जानकारी, भाषा और अलर्ट प्राथमिकताएं प्रबंधित करें",
    "profile.save": "बदलाव सहेजें",
    "profile.saved_success": "प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई",
    "profile.security_notice": "शून्य-पिन सुरक्षा नीति: गोल्डन ऑवर कभी भी यूपीआई पिन या ओटीपी नहीं मांगता।",
  },
};
