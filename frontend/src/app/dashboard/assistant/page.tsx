"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  ShieldCheck, 
  Phone, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  FileText, 
  Layers, 
  HelpCircle, 
  UserCheck, 
  AlertTriangle,
  RefreshCw,
  Globe,
  HeartHandshake,
  Trash2,
  ChevronDown
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { 
  AssistantLanguage, 
  AssistantChatRequest, 
  AssistantChatResponse, 
  QuickAction,
  FraudCaseSummary 
} from "@/types";
import { 
  sendAssistantChat, 
  translateAssistantHistory, 
  fetchAssistantTopics, 
  fetchDashboardCases 
} from "@/lib/api-client";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  language: AssistantLanguage;
  quickActions?: QuickAction[];
  followUps?: string[];
  topic?: string;
  timestamp: string;
}

const STATIC_SUGGESTED_QUESTIONS: Record<AssistantLanguage, string[]> = {
  en: [
    "How do I call 1930?",
    "How do I report UPI fraud?",
    "What evidence should I save?",
    "How do I contact my bank?",
    "Can my money be recovered?",
    "What should I do after a fake QR scam?"
  ],
  te: [
    "1930 నంబర్కు ఎలా కాల్ చేయాలి?",
    "UPI మోసాన్ని ఎలా ఫిర్యాదు చేయాలి?",
    "నేను ఏ ఆధారాలను భద్రపరచాలి?",
    "నా బ్యాంకును ఎలా సంప్రదించాలి?",
    "నా డబ్బు తిరిగి వస్తుందా?",
    "నకిలీ QR కోడ్ మోసం తర్వాత ఏమి చేయాలి?"
  ],
  hi: [
    "1930 पर कैसे कॉल करें?",
    "UPI धोखाधड़ी की शिकायत कैसे करें?",
    "कौन से सबूत सुरक्षित रखने चाहिए?",
    "बैंक से कैसे संपर्क करें?",
    "क्या मेरा पैसा वापस मिल सकता है?",
    "फर्जी QR कोड धोखाधड़ी के बाद क्या करें?"
  ]
};

export default function AssistantPage() {
  const { user, token } = useAuth();
  
  // Settings & Toggles with LocalStorage persistence
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [seniorMode, setSeniorMode] = useState(false);
  const [useCaseContext, setUseCaseContext] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [userCases, setUserCases] = useState<FraudCaseSummary[]>([]);

  // Chat State
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Voice & Speech (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize from LocalStorage or Defaults
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("goldenhour_chat_lang") as AssistantLanguage;
      if (savedLang && ["en", "te", "hi"].includes(savedLang)) {
        setLanguage(savedLang);
      }

      const savedSenior = localStorage.getItem("goldenhour_senior_mode");
      if (savedSenior !== null) {
        setSeniorMode(savedSenior === "true");
      }

      const savedHistory = localStorage.getItem("goldenhour_chat_history");
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          } else {
            setMessages([getWelcomeMessage(savedLang || "en", savedSenior === "true")]);
          }
        } catch {
          setMessages([getWelcomeMessage(savedLang || "en", savedSenior === "true")]);
        }
      } else {
        setMessages([getWelcomeMessage(savedLang || "en", savedSenior === "true")]);
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }

    fetchDashboardCases(token).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setUserCases(res.data);
        setActiveCaseId(res.data[0].id);
        setUseCaseContext(true);
      }
    });
  }, [token]);

  // Persist messages to LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("goldenhour_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isTranslating]);

  function getWelcomeMessage(lang: AssistantLanguage, senior: boolean): UIMessage {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (lang === "te") {
      return {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        language: "te",
        timestamp: ts,
        content: senior
          ? "నమస్కారం. నేను గోల్డెన్‌అవర్ AI సైబర్ సహాయకుడిని. ప్రశాంతంగా ఉండండి, మేము మీకు సహాయం చేస్తాము. మీ UPI మోసానికి సంబంధించి 1930 హెల్ప్‌లైన్, బ్యాంక్ వివాదం లేదా సైబర్ పోర్టల్ గురించి నన్ను ఏ ప్రశ్నైనా అడగండి."
          : "నమస్కారం! గోల్డెన్‌అవర్‌కి స్వాగతం. నేను మీ బహుభాషా AI సైబర్ డిఫెన్స్ అసిస్టెంట్‌ని. 1930 నేషనల్ హెల్ప్‌లైన్, cybercrime.gov.in పోర్టల్ మరియు బ్యాంక్ లీన్/ఫ్రీజ్ వివాదాలపై మీకు ఖచ్చితమైన మార్గదర్శనం చేస్తాను. నేను మీకు ఎలా సహాయపడగలను?",
        followUps: [
          "1930 నంబర్కు ఎలా కాల్ చేయాలి?",
          "UPI మోసాన్ని ఎలా ఫిర్యాదు చేయాలి?",
          "నేను ఏ ఆధారాలను భద్రపరచాలి?"
        ]
      };
    } else if (lang === "hi") {
      return {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        language: "hi",
        timestamp: ts,
        content: senior
          ? "नमस्ते। मैं गोल्डनआवर AI साइबर सहायक हूँ। बिल्कुल घबराएं नहीं, हम आपकी पूरी मदद करेंगे। 1930 हेल्पलाइन, बैंक में शिकायत या सबूत जुटाने के बारे में आप मुझसे बेझिझक पूछ सकते हैं।"
          : "नमस्ते! गोल्डनआवर में आपका स्वागत है। मैं आपका बहुभाषी AI साइबर डिफेंस असिस्टेंट हूँ। 1930 साइबर हेल्पलाइन, cybercrime.gov.in पर रिपोर्टिंग, और बैंक खाता लीन/फ्रीज प्रक्रियाओं पर आधिकारिक मार्गदर्शन के लिए तैयार हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
        followUps: [
          "1930 पर कैसे कॉल करें?",
          "UPI धोखाधड़ी की शिकायत कैसे करें?",
          "कौन से सबूत सुरक्षित रखने चाहिए?"
        ]
      };
    } else {
      return {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        language: "en",
        timestamp: ts,
        content: senior
          ? "Hello. I am GoldenHour's AI Cyber Assistant. Please take a deep breath; cyber fraud happens to many honest citizens daily. I will guide you step-by-step through calling 1930 and contacting your bank. How can I help you right now?"
          : "Hello! Welcome to GoldenHour. I am your specialized AI Emergency Cyber Assistant. I provide context-aware guidance on 1930 Golden Hour helpline SOPs, cybercrime.gov.in reporting, and RBI customer liability directives. How can I assist you with your case today?",
        followUps: [
          "How do I call 1930?",
          "How do I report UPI fraud?",
          "What evidence should I save?"
        ]
      };
    }
  }

  // Language Switcher Handler: Translates Visible History and Preserves Context
  const handleLanguageChange = async (newLang: AssistantLanguage) => {
    if (newLang === language) return;
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("goldenhour_chat_lang", newLang);
    }

    if (messages.length === 0) {
      setMessages([getWelcomeMessage(newLang, seniorMode)]);
      return;
    }

    setIsTranslating(true);
    try {
      const payloadMessages = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const res = await translateAssistantHistory(payloadMessages, newLang);
      if (res.success && res.data?.translated_messages) {
        const updated: UIMessage[] = res.data.translated_messages.map((tm: any, i: number) => ({
          id: tm.id || messages[i]?.id || `msg_${i}`,
          role: tm.role || messages[i]?.role || "assistant",
          content: tm.content,
          language: newLang,
          timestamp: tm.timestamp || messages[i]?.timestamp || "",
          quickActions: messages[i]?.quickActions,
          followUps: messages[i]?.followUps,
          topic: messages[i]?.topic,
        }));
        setMessages(updated);
      }
    } catch (e) {
      console.error("Language translation error:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSeniorModeToggle = () => {
    const nextVal = !seniorMode;
    setSeniorMode(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("goldenhour_senior_mode", String(nextVal));
    }
  };

  const handleClearChat = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("goldenhour_chat_history");
    }
    setMessages([getWelcomeMessage(language, seniorMode)]);
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;

    if (language === "te") recognition.lang = "te-IN";
    else if (language === "hi") recognition.lang = "hi-IN";
    else recognition.lang = "en-IN";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };

    recognition.start();
  };

  const toggleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech audio is not supported in this browser.");
      return;
    }

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (language === "te") utterance.lang = "te-IN";
    else if (language === "hi") utterance.lang = "hi-IN";
    else utterance.lang = "en-IN";

    utterance.rate = seniorMode ? 0.85 : 1.0;

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  const sendMessage = async (textToSend: string) => {
    const userText = textToSend.trim();
    if (!userText) return;

    setInput("");
    const userMsg: UIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userText,
      language: language,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload: AssistantChatRequest = {
        message: userText,
        language: language,
        case_id: useCaseContext && activeCaseId ? activeCaseId : undefined,
        use_case_context: useCaseContext && Boolean(activeCaseId),
        senior_citizen_mode: seniorMode,
        conversation_history: history,
      };

      const res = await sendAssistantChat(payload, token);

      if (res.success && res.data) {
        const botMsg: UIMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          content: res.data.reply,
          language: res.data.language,
          quickActions: res.data.suggested_quick_actions,
          followUps: res.data.follow_up_questions,
          topic: res.data.detected_topic,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(res.error?.message || "Failed to receive AI assistance");
      }
    } catch (err: any) {
      const errorMsg: UIMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          language === "te"
            ? "క్షమించండి, సర్వర్‌ను సంప్రదించడంలో సమస్య ఏర్పడింది. దయచేసి అత్యవసరంగా 1930 కు కాల్ చేయండి."
            : language === "hi"
            ? "क्षमा करें, सर्वर से संपर्क करने में असमर्थ। कृपया आपात स्थिति में तुरंत 1930 डायल करें।"
            : "I apologize, but I encountered a communication error. For immediate emergency assistance, please dial the 1930 cyber helpline directly.",
        language: language,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestions = STATIC_SUGGESTED_QUESTIONS[language] || STATIC_SUGGESTED_QUESTIONS.en;
  const activeCaseObj = userCases.find((c) => c.id === activeCaseId) || userCases[0];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header & Assistant Configuration Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE7F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#172F4D] font-bold tracking-wider">MODULE 5 AI</span>
            <span className="text-[#DCE7F0]">•</span>
            <Badge variant="default" className="text-[10px] bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]">
              MHA 1930 & RBI Knowledge Base
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight flex items-center gap-2 mt-0.5">
            AI Cyber Defense Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#71849A] mt-0.5">
            Multilingual intelligent guidance on 1930 Golden Hour reporting, evidence preservation, and bank liens.
          </p>
        </div>

        {/* Toolbar: Language Switcher, Senior Citizen Mode, Clear Chat */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#DCE7F0] text-xs shadow-card">
            <Globe className="w-3.5 h-3.5 text-[#172F4D] ml-2 mr-1" />
            <button
              onClick={() => handleLanguageChange("en")}
              disabled={isTranslating}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "en" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange("te")}
              disabled={isTranslating}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "te" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => handleLanguageChange("hi")}
              disabled={isTranslating}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "hi" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Senior Citizen Mode Toggle */}
          <button
            onClick={handleSeniorModeToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-card ${
              seniorMode
                ? "bg-[#E1F1FB] border-[#477DA8] text-[#172F4D] font-bold"
                : "bg-white border-[#DCE7F0] text-[#71849A] hover:text-[#172F4D]"
            }`}
            title="Senior citizen simplified mode"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-[#172F4D]" />
            <span>Senior Citizen Mode</span>
            {seniorMode && <span className="w-1.5 h-1.5 rounded-full bg-[#172F4D]" />}
          </button>

          {/* Clear Chat Button */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl border border-[#DCE7F0] bg-white hover:bg-red-50 text-[#71849A] hover:text-red-600 transition-colors shadow-card"
            title={language === "te" ? "చాట్ క్లియర్ చేయండి" : language === "hi" ? "चैट साफ करें" : "Clear Chat History"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Case Context & Security Guardrails Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#E1F1FB] border border-[#DCE7F0] text-xs shadow-card">
        <div className="flex items-center gap-2 text-[#172F4D] flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCaseContext}
              disabled={userCases.length === 0}
              onChange={(e) => setUseCaseContext(e.target.checked)}
              className="rounded border-[#DCE7F0] bg-white text-[#172F4D] focus:ring-[#172F4D]"
            />
            <span className="flex items-center gap-1.5 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-[#172F4D]" />
              <span>Use Active Case Context</span>
            </span>
          </label>

          {useCaseContext && userCases.length > 0 && (
            <select
              value={activeCaseId || ""}
              onChange={(e) => setActiveCaseId(e.target.value)}
              className="bg-white border border-[#DCE7F0] rounded-lg px-2.5 py-1 text-xs text-[#172F4D] font-medium outline-none focus:border-[#172F4D]"
            >
              {userCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number}: {c.title.length > 30 ? c.title.substring(0, 30) + "..." : c.title}
                </option>
              ))}
            </select>
          )}

          {userCases.length === 0 && (
            <span className="text-[#71849A]">(No registered fraud cases yet)</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-mono font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Zero-Credential Active (PIN/OTP Auto-Redacted)</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <Card className={`border-[#DCE7F0] shadow-card bg-white flex flex-col justify-between transition-all ${
        seniorMode ? "h-[650px]" : "h-[560px]"
      }`}>
        {/* Chat Messages Scrollable Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Translating Banner */}
          {isTranslating && (
            <div className="p-2.5 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0] flex items-center justify-center gap-2 text-xs text-[#172F4D] animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>
                {language === "te"
                  ? "సంభాషణను తెలుగులోకి అనువదిస్తోంది..."
                  : language === "hi"
                  ? "बातचीत का हिंदी में अनुवाद किया जा रहा है..."
                  : "Translating conversation into English..."}
              </span>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[82%]">
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-[#E1F1FB] border border-[#DCE7F0] flex items-center justify-center text-[#172F4D] shrink-0 mb-1 shadow-card">
                    <Bot className="w-4 h-4 text-[#172F4D]" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 leading-relaxed transition-all ${
                    seniorMode ? "text-base sm:text-lg leading-relaxed font-medium" : "text-xs sm:text-sm"
                  } ${
                    m.role === "user"
                      ? "bg-[#172F4D] text-white rounded-br-none shadow-card font-medium"
                      : "bg-[#F1F6FB] border border-[#DCE7F0] text-[#172F4D] rounded-bl-none shadow-card"
                  }`}
                >
                  {/* Message Text with preserved line-breaks */}
                  <div className="whitespace-pre-line">{m.content}</div>

                  {/* Assistant Message Quick Action Chips */}
                  {m.quickActions && m.quickActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#DCE7F0] flex flex-wrap gap-2">
                      {m.quickActions.map((qa, i) => (
                        <a
                          key={i}
                          href={qa.action_target}
                          target={qa.action_type === "NAVIGATE" && qa.action_target.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] transition-all shadow-card"
                        >
                          {qa.action_type === "CALL" ? (
                            <Phone className="w-3 h-3 text-red-600" />
                          ) : (
                            <ExternalLink className="w-3 h-3 text-[#172F4D]" />
                          )}
                          <span>{qa.label}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Message Bottom Metadata & TTS Button */}
                  <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-[#71849A]">
                    <span className="font-mono">{m.timestamp}</span>

                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSpeak(m.id, m.content)}
                          className={`p-1 rounded hover:bg-white transition-colors ${
                            isSpeaking === m.id ? "text-[#172F4D] font-bold" : "text-[#71849A] hover:text-[#172F4D]"
                          }`}
                          title="Read out loud (Text-to-Speech)"
                        >
                          {isSpeaking === m.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-[#172F4D] animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Follow-up question suggestion chips */}
              {m.followUps && m.followUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-10">
                  {m.followUps.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] transition-all text-left shadow-card"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#172F4D] ml-2 font-medium">
              <Bot className="w-4 h-4 animate-spin text-[#172F4D]" />
              <span>
                {language === "te"
                  ? "గోల్డెన్‌అవర్ AI ఆలోచిస్తోంది..."
                  : language === "hi"
                  ? "गोल्डनआवर AI जवाब तैयार कर रहा है..."
                  : "GoldenHour AI is consulting 1930 & RBI guidelines..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Dynamic Suggested Questions Toolbar */}
        <div className="px-4 py-2.5 bg-[#F1F6FB] border-t border-[#DCE7F0] overflow-x-auto flex items-center gap-2 text-xs scrollbar-none">
          <span className="text-[11px] font-bold text-[#172F4D] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#477DA8]" />
            {language === "te" ? "సూచించిన ప్రశ్నలు:" : language === "hi" ? "सुझाए गए प्रश्न:" : "Suggested Questions:"}
          </span>
          {currentQuestions.map((qText, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(qText)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] text-xs font-semibold whitespace-nowrap transition-colors shadow-card shrink-0"
            >
              {qText}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice (Speech-to-Text) Button */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-[#DCE7F0] flex gap-2 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? "bg-[#EF4444] text-white border-[#EF4444] animate-pulse"
                : "bg-[#F1F6FB] border-[#DCE7F0] text-[#71849A] hover:text-[#172F4D] hover:bg-[#E1F1FB]"
            }`}
            title={isListening ? "Listening... click to stop" : "Speak your question (Speech-to-Text)"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isTranslating}
            placeholder={
              language === "te"
                ? "1930 హెల్ప్‌లైన్, సైబర్ పోర్టల్, ఆధారాలు లేదా RBI నియమాల గురించి అడగండి..."
                : language === "hi"
                ? "1930 हेल्पलाइन, साइबर पोर्टल, सबूत या RBI नियमों के बारे में पूछें..."
                : "Ask about 1930 helpline SOPs, cybercrime.gov.in, account freeze vs reporting..."
            }
            className={`flex-1 px-4 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors ${
              seniorMode ? "text-base sm:text-lg font-medium" : "text-xs sm:text-sm"
            }`}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading || isTranslating || !input.trim()}
            className="gap-1.5 px-4 font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === "te" ? "పంపండి" : language === "hi" ? "भेजें" : "Send"}
            </span>
          </Button>
        </form>
      </Card>

      {/* Mandatory Safety & Legal Advisory Notice */}
      <div className="p-3 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0] text-[11px] text-[#71849A] flex items-start gap-2.5 shadow-card">
        <AlertTriangle className="w-4 h-4 text-[#172F4D] shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[#172F4D]">
          <strong className="text-[#172F4D]">Mandatory Safety Advisory: </strong>
          GoldenHour AI provides educational assistance based on official I4C and RBI procedures. It will never ask for your UPI PIN or OTP. 
          GoldenHour cannot directly freeze bank accounts or guarantee money recovery. Formal complaints must be registered by the citizen directly on 
          <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-[#172F4D] underline ml-1 font-bold">cybercrime.gov.in</a> or by dialing 
          <a href="tel:1930" className="text-red-600 font-bold ml-1">1930</a>.
        </p>
      </div>
    </div>
  );
}
