"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowLeft, 
  Globe, 
  Phone, 
  Building, 
  ShieldAlert, 
  Clock, 
  FileCheck 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { 
  CaseComplaintBundle, 
  GeneratedDocument, 
  ComplaintDocType,
  Language
} from "@/types";
import { 
  fetchCaseComplaints, 
  generateCaseComplaints, 
  updateComplaintDocument, 
  getComplaintPdfDownloadUrl 
} from "@/lib/api-client";

export default function ComplaintStudioPage() {
  const params = useParams();
  const caseId = (params?.caseId as string) || "case_101";
  const { token } = useAuth();
  const { language: globalLang, setLanguage: setGlobalLang, t, formatCurrency } = useLanguage();

  const [bundle, setBundle] = useState<CaseComplaintBundle | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<ComplaintDocType>("BANK_FRAUD_COMPLAINT");
  const [language, setLanguage] = useState<Language>(globalLang);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync with global language changes
  useEffect(() => {
    setLanguage(globalLang);
  }, [globalLang]);

  useEffect(() => {
    loadComplaints(language);
  }, [caseId, language]);

  async function loadComplaints(lang: Language) {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchCaseComplaints(caseId, lang, token);
      if (res.success && res.data) {
        setBundle(res.data);
        const currentDoc = res.data.documents[selectedDocType];
        if (currentDoc) {
          setEditedContent(currentDoc.content);
        }
      }
    } catch (err: any) {
      console.error("Failed to load complaints bundle", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    setStatusMsg(null);
    try {
      const res = await generateCaseComplaints(caseId, language, true, token);
      if (res.success && res.data) {
        setBundle(res.data);
        const currentDoc = res.data.documents[selectedDocType];
        if (currentDoc) {
          setEditedContent(currentDoc.content);
        }
        setStatusMsg({ type: "success", text: "Complaint documents regenerated from verified case data." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to regenerate documents" });
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleSaveEdit() {
    if (!bundle) return;
    setIsSavingEdit(true);
    setStatusMsg(null);
    try {
      const res = await updateComplaintDocument(caseId, selectedDocType, editedContent, language, token);
      if (res.success && res.data) {
        setBundle(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            documents: {
              ...prev.documents,
              [selectedDocType]: res.data!
            }
          };
        });
        setEditMode(false);
        setStatusMsg({ type: "success", text: "Your modifications have been saved to this draft." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save draft edit" });
    } finally {
      setIsSavingEdit(false);
    }
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setGlobalLang(lang);
    setEditMode(false);
  };

  const currentDoc: GeneratedDocument | undefined = bundle?.documents[selectedDocType];

  const docTabs: Array<{ id: ComplaintDocType; title: string; icon: any; short: string }> = [
    {
      id: "BANK_FRAUD_COMPLAINT",
      title: t("emer.doc_bank_letter", "Bank Fraud Dispute Letter"),
      icon: Building,
      short: "Bank Letter"
    },
    {
      id: "BANK_FREEZE_REQUEST",
      title: "Beneficiary Lien / Freeze Request",
      icon: ShieldAlert,
      short: "Lien Request"
    },
    {
      id: "HELPLINE_1930_SCRIPT",
      title: t("emer.doc_1930_script", "1930 Helpline Call Script"),
      icon: Phone,
      short: "1930 Script"
    },
    {
      id: "CYBERCRIME_PORTAL_DRAFT",
      title: t("emer.doc_cyber_cell", "Cybercrime Portal Dossier"),
      icon: FileText,
      short: "Portal Dossier"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE7F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/cases`}
            className="p-2 rounded-lg bg-white border border-[#DCE7F0] hover:bg-[#E1F1FB] text-[#71849A] hover:text-[#172F4D] transition-colors"
            title={t("cases.back_to_cases", "Back to Cases")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#172F4D] tracking-wider">MODULE 6 GENERATOR</span>
              <span className="text-[#DCE7F0]">•</span>
              <span className="text-xs text-[#71849A] font-mono">{bundle?.case_number || "GH-2024-8912"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight flex items-center gap-2">
              {t("complaint.title", "AI Fraud Complaint Generation")}
              <Badge variant="default" className="text-xs bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]">
                Official Dispute Package
              </Badge>
            </h1>
          </div>
        </div>

        {/* Language Switcher & Regeneration */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#DCE7F0] text-xs shadow-card">
            <Globe className="w-3.5 h-3.5 text-[#172F4D] ml-2 mr-1" />
            <button
              onClick={() => handleLanguageChange("en")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "en" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange("te")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "te" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => handleLanguageChange("hi")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "hi" ? "bg-[#172F4D] text-white shadow-card" : "text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              हिंदी
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            isLoading={isRegenerating}
            className="text-xs border-[#DCE7F0] bg-white text-[#172F4D] hover:bg-[#E1F1FB]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#172F4D]" />
            {t("complaint.regenerate", "Regenerate Drafts")}
          </Button>

          <Link href={`/dashboard/cases/${caseId}`}>
            <Button variant="primary" size="sm" className="text-xs font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {t("cases.track_case", "Emergency Tracker (M7)")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Mandatory Statutory & Security Disclaimer Banner */}
      <div className="rounded-xl p-4 bg-[#E1F1FB] border border-[#DCE7F0] shadow-card">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#172F4D] leading-relaxed">
            <span className="font-bold text-[#172F4D]">MANDATORY LEGAL & COMPLIANCE ADVISORY: </span>
            These documents are AI-assisted drafts prepared from your verified case file. 
            <strong className="text-[#172F4D]"> GoldenHour never automatically submits complaints or directly freezes bank accounts. </strong> 
            Only the receiving bank, NPCI, or authorized police authorities (under Section 102 CrPC / BNSS) have legal statutory jurisdiction to freeze or lien an account. 
            Please review, sign, and submit these documents directly to your branch manager and on <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-[#172F4D] font-bold underline">cybercrime.gov.in</a>.
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
            : "bg-red-50 border border-red-200 text-red-900"
        }`}>
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Document Selector Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {docTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDocType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedDocType(tab.id);
                setEditMode(false);
                if (bundle?.documents[tab.id]) {
                  setEditedContent(bundle.documents[tab.id].content);
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between shadow-card ${
                isActive
                  ? "bg-[#E1F1FB] border-[#172F4D] text-[#172F4D] ring-2 ring-[#172F4D]"
                  : "bg-white border-[#DCE7F0] text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${isActive ? "text-[#172F4D]" : "text-[#71849A]"}`} />
                <Badge variant={isActive ? "default" : "outline"} className={`text-[9px] py-0 px-1.5 ${isActive ? "bg-[#172F4D] text-white" : ""}`}>
                  {tab.short}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-bold text-[#172F4D]">{tab.title}</p>
                <span className="text-[10px] text-[#71849A] font-mono">
                  {language.toUpperCase()} • Ready
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Document Workspace */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-[#DCE7F0] shadow-card text-center">
          <div className="w-10 h-10 border-4 border-[#172F4D]/30 border-t-[#172F4D] rounded-full animate-spin mb-3" />
          <h3 className="text-base font-semibold text-[#172F4D]">{t("common.loading", "Generating Legal Dispute Documents...")}</h3>
        </div>
      ) : currentDoc ? (
        <Card className="border-[#DCE7F0] shadow-card bg-white overflow-hidden">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-[#DCE7F0] bg-[#F1F6FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-[10px]">
                  {currentDoc.is_user_edited ? "Citizen Customized Draft" : "AI Verified Draft"}
                </Badge>
              </div>
              <CardTitle className="text-base sm:text-lg text-[#172F4D] mt-0.5">
                {currentDoc.title}
              </CardTitle>
            </div>

            {/* Action Buttons: Edit, Copy, Download PDF */}
            <div className="flex items-center gap-2 flex-wrap">
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedContent(currentDoc.content);
                    setEditMode(true);
                  }}
                  className="text-xs border-[#DCE7F0] bg-white text-[#172F4D] hover:bg-[#E1F1FB]"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1 text-[#172F4D]" />
                  {t("complaint.edit_mode", "Edit Draft")}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedContent(currentDoc.content);
                      setEditMode(false);
                    }}
                    className="text-xs text-[#71849A] hover:text-[#172F4D]"
                  >
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={isSavingEdit}
                    className="text-xs font-bold gap-1 bg-[#172F4D] hover:bg-[#1D3B60] text-white shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("complaint.save_edits", "Save Changes")}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyText(currentDoc.content)}
                className="text-xs text-[#71849A] hover:text-[#172F4D] hover:bg-[#E1F1FB]"
                title="Copy formatted text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? t("common.copied", "Copied!") : t("common.copy", "Copy Text")}
              </Button>

              <a
                href={getComplaintPdfDownloadUrl(caseId, selectedDocType, language)}
                target="_blank"
                rel="noreferrer"
                download
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>{t("common.download_pdf", "Download Styled PDF")}</span>
                </Button>
              </a>
            </div>
          </CardHeader>

          {/* Document Content View / Inline Editor */}
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs">
              <div>
                <span className="text-[#71849A] font-semibold">{t("table.utr", "12-Digit UTR")}:</span>
                <p className="font-mono font-bold text-[#172F4D] mt-0.5">
                  {currentDoc.structured_fields.transaction_id_utr || "Pending"}
                </p>
              </div>
              <div>
                <span className="text-[#71849A] font-semibold">{t("table.amount", "Disputed Amount")}:</span>
                <p className="font-mono font-bold text-red-600 mt-0.5">
                  {currentDoc.structured_fields.amount ? formatCurrency(Number(currentDoc.structured_fields.amount)) : "Pending"}
                </p>
              </div>
              <div>
                <span className="text-[#71849A] font-semibold">{t("table.vpa", "Beneficiary VPA")}:</span>
                <p className="font-mono text-[#172F4D] font-medium mt-0.5 truncate">
                  {currentDoc.structured_fields.beneficiary_upi_id || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-[#71849A] font-semibold">{t("report.extracted_bank", "Beneficiary Bank")}:</span>
                <p className="font-semibold text-[#172F4D] mt-0.5">
                  {currentDoc.structured_fields.beneficiary_bank || "Under Investigation"}
                </p>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-2">
                <textarea
                  rows={18}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-[#F1F6FB] border border-[#DCE7F0] rounded-xl p-4 text-xs font-mono text-[#172F4D] leading-relaxed focus:outline-none focus:border-[#172F4D] focus:bg-white"
                />
              </div>
            ) : (
              <div className="p-5 sm:p-7 rounded-xl bg-white border border-[#DCE7F0] text-[#172F4D] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-card">
                {currentDoc.content}
              </div>
            )}
          </CardContent>

          <CardFooter className="py-3 px-6 bg-[#F1F6FB] border-t border-[#DCE7F0] text-[11px] text-[#71849A] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>{currentDoc.disclaimer}</span>
            <span className="font-mono text-[#172F4D] font-semibold">Form Ref: GH-M6-{selectedDocType}</span>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
