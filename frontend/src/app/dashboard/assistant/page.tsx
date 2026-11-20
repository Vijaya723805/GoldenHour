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
  HeartHandshake
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { 
  AssistantLanguage, 
  AssistantChatRequest, 
  AssistantChatResponse, 
  QuickAction 
} from "@/types";
import { sendAssistantChat, fetchAssistantTopics } from "@/lib/api-client";

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

export default function AssistantPage() {
  const { user, token } = useAuth();
  
  // Settings & Toggles
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [seniorMode, setSeniorMode] = useState(false);
  const [useCaseContext, setUseCaseContext] = useState(true);
  const [activeCaseId, setActiveCaseId] = useState("case_101");

  // Chat State
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<Record<string, Array<{ id: string; label: string; topic: string }>>>({});
  
  // Voice & Speech (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition & Default Greetings
  useEffect(() => {
    // Check Speech Recognition support in browser
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }

    // Load topic prompt chips
    fetchAssistantTopics().then((res) => {
      if (res.success && res.data) {
        setTopics(res.data);
      }
    });

    // Seed localized initial welcome message
    setMessages([getWelcomeMessage(language, seniorMode)]);
  }, []);

  // Update welcome message if user changes language with empty history
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([getWelcomeMessage(language, seniorMode)]);
    }
  }, [language, seniorMode]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function getWelcomeMessage(lang: AssistantLanguage, senior: boolean): UIMessage {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (lang === "te") {
      return {
        id: "msg_welcome",
        role: "assistant",
        language: "te",
        timestamp: ts,
        content: senior
          ? "నమస్కారం. నేను గోల్డెన్‌అవర్ AI సైబర్ సహాయకుడిని. ప్రశాంతంగా ఉండండి, మేము మీకు సహాయం చేస్తాము. మీ UPI మోసానికి సంబంధించి 1930 హెల్ప్‌లైన్, బ్యాంక్ వివాదం లేదా సైబర్ పోర్టల్ గురించి నన్ను ఏ ప్రశ్నైనా అడగండి."
          : "నమస్కారం! నేను గోల్డెన్‌అవర్ బహుభాషా AI సైబర్ డిఫెన్స్ అసిస్టెంట్‌ని. 1930 నేషనల్ హెల్ప్‌లైన్ సంప్రదింపులు, cybercrime.gov.in లో రిపోర్టింగ్, బ్యాంక్ లీన్/ఫ్రీజ్ తేడాలు మరియు ఆధారాల భద్రపరచడంపై మీకు మార్గదర్శనం చేస్తాను. నేను మీకు ఎలా సహాయపడగలను?",
        followUps: [
          "1930 సైబర్ హెల్ప్‌లైన్‌కు ఎలా కాల్ చేయాలి?",
          "పోర్టల్‌లో ఫిర్యాదు మరియు ఖాతా ఫ్రీజ్ మధ్య తేడా?",
          "సీనియర్ సిటిజన్ సులభ రక్షణ మార్గదర్శి"
        ]
      };
    } else if (lang === "hi") {
      return {
        id: "msg_welcome",
        role: "assistant",
        language: "hi",
        timestamp: ts,
        content: senior
          ? "नमस्ते। मैं गोल्डनआवर AI साइबर सहायक हूँ। बिल्कुल घबराएं नहीं, हम आपकी पूरी मदद करेंगे। 1930 हेल्पलाइन, बैंक में शिकायत या सबूत जुटाने के बारे में आप मुझसे बेझिझक पूछ सकते हैं।"
          : "नमस्ते! मैं गोल्डनआवर का बहुभाषी AI साइबर डिफेंस असिस्टेंट हूँ। 1930 साइबर हेल्पलाइन, cybercrime.gov.in पर रिपोर्टिंग, बैंक खाता लीन/फ्रीज नियम और साक्ष्य संरक्षण पर आधिकारिक मार्गदर्शन के लिए तैयार हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
        followUps: [
          "1930 साइबर हेल्पलाइन पर कॉल कैसे करें?",
          "रिपोर्टिंग और बैंक अकाउंट फ्रीज में क्या अंतर है?",
          "धोखाधड़ी में कौन से सबूत सुरक्षित रखने चाहिए?"
        ]
      };
    } else {
      return {
        id: "msg_welcome",
        role: "assistant",
        language: "en",
        timestamp: ts,
        content: senior
          ? "Hello. I am GoldenHour's AI Cyber Assistant. Please take a deep breath; cyber fraud happens to many honest citizens daily. I will guide you step-by-step through calling 1930 and contacting your bank. How can I help you right now?"
          : "Hello! I am GoldenHour's Multilingual AI Emergency Cyber Assistant. I specialize in Indian UPI fraud remediation, 1930 Golden Hour helpline SOPs, cybercrime.gov.in reporting, and RBI customer liability directives. How can I assist you with your case today?",
        followUps: [
          "How do I contact the 1930 helpline?",
          "What is the difference between reporting and freezing an account?",
          "What evidence should I preserve?",
          "Senior citizen step-by-step guidance"
        ]
      };
    }
  }

  // Handle Voice Input (Speech-to-Text)
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

    // Set voice recognition language code
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
        // Automatically submit spoken inquiry
        sendMessage(transcript);
      }
    };

    recognition.start();
  };

  // Handle Text-to-Speech (TTS Audio Playback)
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

    // Pick appropriate voice tag
    if (language === "te") utterance.lang = "te-IN";
    else if (language === "hi") utterance.lang = "hi-IN";
    else utterance.lang = "en-IN";

    utterance.rate = seniorMode ? 0.85 : 1.0; // Slower rate for senior citizens

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
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload: AssistantChatRequest = {
        message: userText,
        language: language,
        case_id: activeCaseId,
        use_case_context: useCaseContext,
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

  const currentTopics = topics[language] || topics["en"] || [];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header & Assistant Configuration Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gold tracking-wider">MODULE 5 AI</span>
            <span className="text-slate-600">•</span>
            <Badge variant="default" className="text-[10px] bg-purple-900/60 text-purple-200 border-purple-500/30">
              MHA 1930 & RBI Knowledge Base
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
            AI Cyber Defense Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Multilingual guidance on 1930 Golden Hour reporting, evidence preservation, and bank liens.
          </p>
        </div>

        {/* Toolbar: Language Switcher, Senior Citizen Mode, Case Context */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector */}
          <div className="flex items-center bg-navy-950 p-1 rounded-xl border border-navy-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-gold ml-2 mr-1" />
            <button
              onClick={() => setLanguage("en")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "en" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("te")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "te" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "hi" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Senior Citizen Mode Toggle */}
          <button
            onClick={() => setSeniorMode(!seniorMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              seniorMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/40"
                : "bg-navy-950 border-navy-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Senior citizen simplified mode"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
            <span>Senior Citizen Mode</span>
            {seniorMode && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>
        </div>
      </div>

      {/* Case Context & Security Guardrails Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-navy-950/80 border border-navy-800 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
          <input
            type="checkbox"
            checked={useCaseContext}
            onChange={(e) => setUseCaseContext(e.target.checked)}
            className="rounded border-navy-700 bg-navy-900 text-purple focus:ring-purple"
          />
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-gold" />
            <span>
              Use verified case parameters in AI advice (Case GH-2024-8912: ₹24,500 / UTR 412890563412)
            </span>
          </span>
        </label>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Zero-Credential Active (PIN/OTP Auto-Redacted)</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <Card className={`border-navy-800 shadow-2xl flex flex-col justify-between transition-all ${
        seniorMode ? "h-[620px]" : "h-[540px]"
      }`}>
        {/* Chat Messages Scrollable Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-purple/30 border border-purple/50 flex items-center justify-center text-purple-light shrink-0 mb-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 leading-relaxed transition-all ${
                    seniorMode ? "text-sm sm:text-base leading-relaxed" : "text-xs sm:text-sm"
                  } ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-purple to-purple-700 text-white rounded-br-none shadow-glow font-medium"
                      : "bg-navy-950/90 border border-navy-800 text-slate-100 rounded-bl-none shadow-md"
                  }`}
                >
                  {/* Message Text with preserved line-breaks */}
                  <div className="whitespace-pre-line">{m.content}</div>

                  {/* Assistant Message Quick Action Chips */}
                  {m.quickActions && m.quickActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-navy-800 flex flex-wrap gap-2">
                      {m.quickActions.map((qa, i) => (
                        <a
                          key={i}
                          href={qa.action_target}
                          target={qa.action_type === "NAVIGATE" && qa.action_target.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 transition-all shadow-sm"
                        >
                          {qa.action_type === "CALL" ? (
                            <Phone className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ExternalLink className="w-3 h-3 text-gold" />
                          )}
                          <span>{qa.label}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Message Bottom Metadata & TTS Button */}
                  <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{m.timestamp}</span>

                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSpeak(m.id, m.content)}
                          className={`p-1 rounded hover:bg-navy-800 transition-colors ${
                            isSpeaking === m.id ? "text-gold" : "text-slate-400 hover:text-slate-200"
                          }`}
                          title="Read out loud (Text-to-Speech)"
                        >
                          {isSpeaking === m.id ? (
                            <VolumeX className="w-3.5 h-3.5 animate-pulse" />
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
                <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                  {m.followUps.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-navy-900/80 hover:bg-purple-950 text-slate-300 hover:text-gold border border-navy-700 transition-all text-left"
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
            <div className="flex items-center gap-2 text-xs text-purple-light ml-2">
              <Bot className="w-4 h-4 animate-spin text-gold" />
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

        {/* Quick Topic Chips Toolbar */}
        <div className="px-4 py-2 bg-navy-950/90 border-t border-navy-800/80 overflow-x-auto flex items-center gap-2 text-xs scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            {language === "te" ? "త్వరిత ప్రశ్నలు:" : language === "hi" ? "अक्सर पूछे जाने वाले सवाल:" : "Common Inquiries:"}
          </span>
          {currentTopics.map((item) => (
            <button
              key={item.id}
              onClick={() => sendMessage(item.label)}
              className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-purple-900/60 text-slate-300 hover:text-white border border-navy-800 text-[11px] font-medium whitespace-nowrap transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice (Speech-to-Text) Button */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-navy-800 flex gap-2 bg-navy-950/95">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? "bg-crimson text-white border-crimson animate-pulse"
                : "bg-navy-900 border-navy-700 text-slate-300 hover:text-gold hover:border-gold/50"
            }`}
            title={isListening ? "Listening... click to stop" : "Speak your question (Speech-to-Text)"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              language === "te"
                ? "1930 హెల్ప్‌లైన్, సైబర్ పోర్టల్, ఆధారాలు లేదా RBI నియమాల గురించి అడగండి..."
                : language === "hi"
                ? "1930 हेल्पलाइन, साइबर पोर्टल, सबूत या RBI नियमों के बारे में पूछें..."
                : "Ask about 1930 helpline SOPs, cybercrime.gov.in, account freeze vs reporting..."
            }
            className={`flex-1 px-4 py-2.5 rounded-xl bg-navy-900 border border-navy-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple ${
              seniorMode ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading || !input.trim()}
            className="gap-1.5 px-4 font-bold shadow-glow"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === "te" ? "పంపండి" : language === "hi" ? "भेजें" : "Send"}
            </span>
          </Button>
        </form>
      </Card>

      {/* Mandatory Safety & Legal Advisory Notice */}
      <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Mandatory Safety Advisory: </strong>
          GoldenHour AI provides educational assistance based on official I4C and RBI procedures. It will never ask for your UPI PIN or OTP. 
          GoldenHour cannot directly freeze bank accounts or guarantee money recovery. Formal complaints must be registered by the citizen directly on 
          <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-gold underline ml-1">cybercrime.gov.in</a> or by dialing 
          <a href="tel:1930" className="text-emerald-400 font-bold ml-1">1930</a>.
        </p>
      </div>
    </div>
  );
}
