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
  Layers, 
  ExternalLink, 
  Lock, 
  FileCheck, 
  Printer, 
  Globe, 
  HelpCircle,
  Phone,
  Building,
  ShieldAlert,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { 
  CaseComplaintBundle, 
  GeneratedDocument, 
  ComplaintDocType 
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

  const [bundle, setBundle] = useState<CaseComplaintBundle | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<ComplaintDocType>("BANK_FRAUD_COMPLAINT");
  const [language, setLanguage] = useState<"en" | "te" | "hi">("en");
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadComplaints(language);
  }, [caseId, language]);

  async function loadComplaints(lang: "en" | "te" | "hi") {
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
        // Update local bundle
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

  const currentDoc: GeneratedDocument | undefined = bundle?.documents[selectedDocType];

  const docTabs: Array<{ id: ComplaintDocType; title: string; icon: any; short: string }> = [
    {
      id: "BANK_FRAUD_COMPLAINT",
      title: "Bank Fraud Dispute Letter",
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
      title: "1930 Helpline Call Script",
      icon: Phone,
      short: "1930 Script"
    },
    {
      id: "CYBERCRIME_PORTAL_DRAFT",
      title: "Cybercrime Portal Dossier",
      icon: FileText,
      short: "Portal Dossier"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/cases`}
            className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-slate-300 transition-colors"
            title="Back to Cases"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gold tracking-wider">MODULE 6 GENERATOR</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{bundle?.case_number || "GH-2024-8912"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              AI Fraud Complaint Generation
              <Badge variant="default" className="text-xs bg-purple-900/60 text-purple-200 border-purple-500/30">
                Official Dispute Package
              </Badge>
            </h1>
          </div>
        </div>

        {/* Language Switcher & Regeneration */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector */}
          <div className="flex items-center bg-navy-950 p-1 rounded-xl border border-navy-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-gold ml-2 mr-1" />
            <button
              onClick={() => { setLanguage("en"); setEditMode(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "en" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              English
            </button>
            <button
              onClick={() => { setLanguage("te"); setEditMode(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "te" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => { setLanguage("hi"); setEditMode(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                language === "hi" ? "bg-purple text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
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
            className="text-xs border-navy-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Regenerate Drafts
          </Button>

          <Link href={`/dashboard/cases/${caseId}`}>
            <Button variant="gold" size="sm" className="text-xs font-bold text-navy-950 shadow-gold-glow">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Emergency Tracker (M7)
            </Button>
          </Link>

          <Link href={`/dashboard/cases/${caseId}/verification`}>
            <Button variant="ghost" size="sm" className="text-xs text-purple-light hover:text-white">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Verified Evidence
            </Button>
          </Link>
        </div>
      </div>

      {/* Mandatory Statutory & Security Disclaimer Banner */}
      <div className="rounded-xl p-4 bg-gradient-to-r from-navy-950 via-purple-950/30 to-navy-950 border border-purple-500/30 shadow-lg">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <span className="font-bold text-gold">MANDATORY LEGAL & COMPLIANCE ADVISORY: </span>
            These documents are AI-assisted drafts prepared from your verified case file. 
            <strong className="text-white"> GoldenHour never automatically submits complaints or directly freezes bank accounts. </strong> 
            Only the receiving bank, NPCI, or authorized police authorities (under Section 102 CrPC / BNSS) have legal statutory jurisdiction to freeze or lien an account. 
            Please review, sign, and submit these documents directly to your branch manager and on <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-gold underline">cybercrime.gov.in</a>.
          </div>
        </div>
      </div>

      {/* Missing Required Information Banner (if any) */}
      {bundle && bundle.missing_information_summary && bundle.missing_information_summary.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300">Action Required – Missing Case Parameters:</span>
            <p className="leading-relaxed">
              The following parameters were missing from uploaded evidence: 
              <span className="font-semibold text-white"> {bundle.missing_information_summary.join(", ")}</span>. 
              You can supply them directly in the text editor below before downloading your PDF.
            </p>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          statusMsg.type === "success" 
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            : "bg-crimson/10 border border-crimson/30 text-crimson-light"
        }`}>
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg.text}</span>
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
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-purple/20 border-purple text-white ring-1 ring-purple shadow-glow"
                  : "bg-navy-950 border-navy-800 text-slate-400 hover:text-slate-200 hover:bg-navy-900"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${isActive ? "text-gold" : "text-slate-500"}`} />
                <Badge variant={isActive ? "gold" : "outline"} className="text-[9px] py-0 px-1.5">
                  {tab.short}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">{tab.title}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {language.toUpperCase()} • Ready
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Document Workspace: Formatted Preview vs. Live Editor */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-navy-950 rounded-2xl border border-navy-800 text-center">
          <div className="w-10 h-10 border-4 border-purple/30 border-t-purple rounded-full animate-spin mb-3" />
          <h3 className="text-base font-semibold text-white">Generating Legal Dispute Documents...</h3>
          <p className="text-xs text-slate-400 mt-1">
            Formatting formal complaint in {language === "te" ? "Telugu" : language === "hi" ? "Hindi" : "English"} citing RBI/2017-18/15 guidelines.
          </p>
        </div>
      ) : currentDoc ? (
        <Card className="border-navy-800 shadow-2xl bg-navy-950/90 overflow-hidden">
          {/* Document Workspace Action Bar */}
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-navy-800 bg-navy-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-[10px]">
                  {currentDoc.is_user_edited ? "Citizen Customized Draft" : "AI Verified Draft"}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  Generated: {new Date(currentDoc.generated_at).toLocaleDateString()}
                </span>
              </div>
              <CardTitle className="text-base sm:text-lg text-white mt-0.5">
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
                  className="text-xs border-navy-700 text-slate-300 hover:text-white"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1 text-gold" />
                  Edit Draft
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
                    className="text-xs text-slate-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={isSavingEdit}
                    className="text-xs font-bold gap-1 shadow-glow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyText(currentDoc.content)}
                className="text-xs text-slate-300 hover:text-white"
                title="Copy formatted text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copied!" : "Copy Text"}
              </Button>

              <a
                href={getComplaintPdfDownloadUrl(caseId, selectedDocType, language)}
                target="_blank"
                rel="noreferrer"
                download
              >
                <Button
                  variant="gold"
                  size="sm"
                  className="text-xs font-bold text-navy-950 shadow-gold-glow gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-navy-950" />
                  <span>Download Styled PDF</span>
                </Button>
              </a>
            </div>
          </CardHeader>

          {/* Document Content View / Inline Editor */}
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Metadata Summary Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-navy-900/60 border border-navy-800 text-xs">
              <div>
                <span className="text-slate-400">12-Digit UTR:</span>
                <p className="font-mono font-bold text-gold mt-0.5">
                  {currentDoc.structured_fields.transaction_id_utr || "Pending"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Disputed Amount:</span>
                <p className="font-mono font-bold text-crimson-light mt-0.5">
                  {currentDoc.structured_fields.amount ? `₹ ${Number(currentDoc.structured_fields.amount).toLocaleString("en-IN")}` : "Pending"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Beneficiary VPA:</span>
                <p className="font-mono text-slate-200 mt-0.5 truncate">
                  {currentDoc.structured_fields.beneficiary_upi_id || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Beneficiary Bank:</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {currentDoc.structured_fields.beneficiary_bank || "Under Investigation"}
                </p>
              </div>
            </div>

            {/* Document Body: View vs. Edit Mode */}
            {editMode ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gold">
                  Inline Text Editor (Modify names, addresses, or add additional facts before generating PDF):
                </label>
                <textarea
                  rows={18}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-navy-900 border border-purple/40 rounded-xl p-4 text-xs font-mono text-slate-100 leading-relaxed focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
            ) : (
              <div className="p-5 sm:p-7 rounded-xl bg-navy-900/40 border border-navy-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {currentDoc.content}
              </div>
            )}

            {/* Recommended Action Checklist */}
            {currentDoc.action_items && currentDoc.action_items.length > 0 && (
              <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800 space-y-2">
                <h4 className="text-xs font-bold text-gold flex items-center gap-1.5 uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-gold" />
                  Recommended Next Steps for Filing:
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {currentDoc.action_items.map((act, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-purple/30 text-purple-light text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>

          {/* Footer Disclaimer */}
          <CardFooter className="py-3 px-6 bg-navy-950 border-t border-navy-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>{currentDoc.disclaimer}</span>
            <span className="font-mono text-slate-400">Form Ref: GH-M6-{selectedDocType}</span>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
