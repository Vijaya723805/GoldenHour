"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  CaseVerificationReport, 
  VerificationStatus,
  SeverityLevel,
  QualityIssueType,
  ConfirmVerificationPayload
} from "@/types";
import { 
  fetchCaseVerification, 
  triggerCaseVerification, 
  confirmCaseVerification 
} from "@/lib/api-client";
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  Copy, 
  Layers, 
  Info, 
  Check, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Edit3,
  Clock
} from "lucide-react";

export default function SmartVerificationPage() {
  const params = useParams();
  const caseId = (params?.caseId as string) || "case_101";

  const [report, setReport] = useState<CaseVerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reverifying, setReverifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "missing" | "conflicts" | "quality" | "confirm_needed">("all");
  const [activeScenario, setActiveScenario] = useState<string>("case");
  
  // Human-in-the-loop citizen corrections state
  const [userCorrections, setUserCorrections] = useState<Record<string, string>>({});
  const [citizenNotes, setCitizenNotes] = useState("");
  const [citizenConsent, setCitizenConsent] = useState(false);
  const [savingConfirmation, setSavingConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadVerificationReport();
  }, [caseId]);

  async function loadVerificationReport() {
    setLoading(true);
    setSuccessMessage(null);
    try {
      const res = await fetchCaseVerification(caseId);
      if (res.success && res.data) {
        setReport(res.data);
        setActiveScenario("case");
      }
    } catch (err) {
      console.error("Failed to load verification report", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReverify() {
    setReverifying(true);
    setSuccessMessage(null);
    try {
      const res = await triggerCaseVerification(caseId);
      if (res.success && res.data) {
        setReport(res.data);
        setSuccessMessage("Smart Evidence Verification re-run completed.");
      }
    } catch (err) {
      console.error("Error reverifying case", err);
    } finally {
      setReverifying(false);
    }
  }

  const handleCorrectionChange = (key: string, value: string) => {
    setUserCorrections(prev => ({ ...prev, [key]: value }));
  };

  async function handleConfirmVerification() {
    if (!report) return;
    setSavingConfirmation(true);
    try {
      const payload: ConfirmVerificationPayload = {
        is_confirmed: true,
        user_corrections: userCorrections,
        citizen_notes: citizenNotes || undefined
      };
      const res = await confirmCaseVerification(report.case_id, payload);
      if (res.success && res.data) {
        setReport(res.data);
        setSuccessMessage("Case verification officially confirmed and locked by citizen.");
      }
    } catch (err) {
      console.error("Error confirming verification", err);
    } finally {
      setSavingConfirmation(false);
    }
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            EVIDENCE VERIFIED & SEALED
          </span>
        );
      case "HIGH_DISCREPANCY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            HIGH DISCREPANCY DETECTED
          </span>
        );
      case "ACTION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            CITIZEN ACTION REQUIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#172F4D]" />
            IN REVIEW
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 border border-red-200">CRITICAL</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0]">INFO</span>;
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#172F4D]/30 border-t-[#172F4D] rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-[#172F4D]">Running Smart Evidence Verification Engine...</h3>
        <p className="text-sm text-[#71849A] mt-1 max-w-md">
          Cross-checking receipts, comparing transaction amounts across screenshots, analyzing image blur, and detecting inconsistencies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE7F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/cases`}
            className="p-2 rounded-lg bg-white border border-[#DCE7F0] hover:bg-[#E1F1FB] text-[#71849A] hover:text-[#172F4D] transition-colors"
            title="Back to Cases"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#172F4D] tracking-wider">MODULE 4 ENGINE</span>
              <span className="text-[#DCE7F0]">•</span>
              <span className="text-xs text-[#71849A] font-mono">{report?.case_number}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#172F4D] flex items-center gap-2">
              Smart Evidence Verification
              {report && getStatusBadge(report.verification_status)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}`}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E1F1FB] text-[#172F4D] text-xs font-bold border border-[#DCE7F0] flex items-center gap-1.5 transition-all shadow-card"
          >
            <Clock className="w-3.5 h-3.5 text-[#172F4D]" />
            Case Tracker (M7)
          </Link>
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}/complaints`}
            className="px-3 py-1.5 rounded-lg bg-[#172F4D] hover:bg-[#1D3B60] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-card"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            Generate Complaints (Module 6)
          </Link>
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}/extraction`}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E1F1FB] text-[#172F4D] text-xs font-medium border border-[#DCE7F0] flex items-center gap-1.5 transition-colors shadow-card"
          >
            <Layers className="w-3.5 h-3.5 text-[#172F4D]" />
            AI Raw Extractions
          </Link>
          <button
            onClick={handleReverify}
            disabled={reverifying}
            className="px-3 py-1.5 rounded-lg bg-[#E1F1FB] hover:bg-[#D4EBF9] text-[#172F4D] text-xs font-semibold border border-[#DCE7F0] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#172F4D] ${reverifying ? "animate-spin" : ""}`} />
            {reverifying ? "Verifying..." : "Re-Verify Case"}
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory & Legal Disclaimer Alert */}
      <div className="rounded-xl p-4 bg-[#E1F1FB] border border-[#DCE7F0] shadow-card">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#172F4D] leading-relaxed">
            <span className="font-bold text-[#172F4D]">IMPORTANT LEGAL & VERIFICATION NOTICE: </span>
            A complete case does not mean the fraud is proven. Verification only evaluates the quality, completeness, and cross-consistency of submitted digital evidence for police filing and bank lien requests.
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {report && (
        <>
          {/* Verification Scores Dashboard Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#DCE7F0] shadow-card relative overflow-hidden">
              <div className="text-[11px] font-semibold text-[#71849A] uppercase tracking-wider mb-1">
                Overall Verification Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${
                  report.overall_score >= 80 ? "text-emerald-700" :
                  report.overall_score >= 60 ? "text-[#172F4D]" : "text-red-600"
                }`}>
                  {report.overall_score}%
                </span>
                <span className="text-xs text-[#71849A]">reliability</span>
              </div>
              <div className="w-full bg-[#E5F0F8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    report.overall_score >= 80 ? "bg-emerald-600" :
                    report.overall_score >= 60 ? "bg-[#172F4D]" : "bg-red-500"
                  }`} 
                  style={{ width: `${report.overall_score}%` }} 
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#DCE7F0] shadow-card">
              <div className="text-[11px] font-semibold text-[#71849A] uppercase tracking-wider mb-1">
                Completeness Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#172F4D]">{report.completeness_score}%</span>
                <span className="text-xs text-[#71849A]">essential fields</span>
              </div>
              <div className="w-full bg-[#E5F0F8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#172F4D] rounded-full" style={{ width: `${report.completeness_score}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#DCE7F0] shadow-card">
              <div className="text-[11px] font-semibold text-[#71849A] uppercase tracking-wider mb-1">
                Consistency Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#172F4D]">
                  {report.consistency_score}%
                </span>
                <span className="text-xs text-[#71849A]">cross-evidence</span>
              </div>
              <div className="w-full bg-[#E5F0F8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#172F4D] rounded-full" style={{ width: `${report.consistency_score}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#DCE7F0] shadow-card">
              <div className="text-[11px] font-semibold text-[#71849A] uppercase tracking-wider mb-1">
                Evidence Quality
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${
                  report.quality_score >= 80 ? "text-emerald-700" :
                  report.quality_score >= 50 ? "text-[#172F4D]" : "text-red-600"
                }`}>
                  {report.quality_score}%
                </span>
                <span className="text-xs text-[#71849A]">sharpness / OCR</span>
              </div>
              <div className="w-full bg-[#E5F0F8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    report.quality_score >= 80 ? "bg-emerald-600" :
                    report.quality_score >= 50 ? "bg-[#172F4D]" : "bg-red-500"
                  }`} 
                  style={{ width: `${report.quality_score}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Citizen Verification Seal Status */}
          {report.is_citizen_verified && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Citizen Verified & Cryptographically Locked
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Confirmed by {report.verified_by_user || "Citizen Complainant"} on{" "}
                    {report.verified_at ? new Date(report.verified_at).toLocaleString() : "Recent"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-mono font-bold rounded-full border border-emerald-300">
                LOCKED FOR DRAFTING
              </span>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#DCE7F0] overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-t-lg font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "border-[#172F4D] text-[#172F4D] bg-[#E1F1FB] font-bold"
                  : "border-transparent text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              All Verification Findings
            </button>
            <button
              onClick={() => setActiveTab("verified")}
              className={`px-3 py-2 rounded-t-lg font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "verified"
                  ? "border-emerald-600 text-emerald-900 bg-emerald-50 font-bold"
                  : "border-transparent text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Information ({report.verified_fields.length})
            </button>
            <button
              onClick={() => setActiveTab("missing")}
              className={`px-3 py-2 rounded-t-lg font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "missing"
                  ? "border-amber-600 text-amber-900 bg-amber-50 font-bold"
                  : "border-transparent text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              Missing Information ({report.missing_fields.length})
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`px-3 py-2 rounded-t-lg font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "conflicts"
                  ? "border-red-600 text-red-900 bg-red-50 font-bold"
                  : "border-transparent text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Inconsistencies & Conflicts ({report.inconsistencies.length})
            </button>
            <button
              onClick={() => setActiveTab("quality")}
              className={`px-3 py-2 rounded-t-lg font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "quality"
                  ? "border-[#172F4D] text-[#172F4D] bg-[#E1F1FB] font-bold"
                  : "border-transparent text-[#71849A] hover:text-[#172F4D]"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-[#172F4D]" />
              Quality Warnings ({report.quality_issues.length})
            </button>
          </div>

          {/* TAB CONTENT 1: Verified Information Cards */}
          {(activeTab === "all" || activeTab === "verified") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Verified Information (High Confidence & Cross-Evidence Agreement)
                </h3>
                <span className="text-xs text-[#71849A] font-semibold">
                  {report.verified_fields.length} parameters verified
                </span>
              </div>

              {report.verified_fields.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-xl border border-[#DCE7F0] text-[#71849A] text-xs shadow-card">
                  No verified parameters found yet. Upload clear UPI transaction receipts to extract details.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.verified_fields.map((field) => (
                    <div
                      key={field.field_key}
                      className="bg-white rounded-xl p-3.5 border border-[#DCE7F0] hover:border-[#172F4D] transition-all flex flex-col justify-between shadow-card"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-[#71849A] uppercase tracking-wider">
                            {field.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            {Math.round(field.confidence * 100)}% Match
                          </span>
                        </div>
                        <div className="text-base font-bold text-[#172F4D] mb-2 break-all">
                          {field.field_key === "amount" ? (
                            `₹ ${Number(field.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          ) : (
                            String(field.value)
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#DCE7F0] flex items-center justify-between text-[11px] text-[#71849A]">
                        <span className="flex items-center gap-1 text-[#71849A]">
                          <Layers className="w-3 h-3 text-[#172F4D]" />
                          {field.source_file_names.length} source file(s)
                        </span>
                        {field.is_cross_verified && (
                          <span className="px-1.5 py-0.5 bg-[#E1F1FB] text-[#172F4D] rounded text-[10px] border border-[#DCE7F0] font-semibold">
                            Cross-Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 2: Missing Information Detection */}
          {(activeTab === "all" || activeTab === "missing") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Missing Information Detection ({report.missing_fields.length})
                </h3>
                <span className="text-xs text-amber-800 font-semibold">
                  {report.missing_fields.filter(m => m.severity === "CRITICAL").length} Critical missing items
                </span>
              </div>

              {report.missing_fields.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-card">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>All essential fraud transaction fields are present in the submitted evidence.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.missing_fields.map((missing) => (
                    <div
                      key={missing.field_key}
                      className={`p-4 rounded-xl border transition-all shadow-card ${
                        missing.severity === "CRITICAL"
                          ? "bg-red-50/50 border-red-200"
                          : "bg-white border-[#DCE7F0]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(missing.severity)}
                          <h4 className="text-sm font-bold text-[#172F4D]">{missing.label}</h4>
                        </div>
                        {missing.requires_user_action && (
                          <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            Citizen Input Required
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#172F4D] mb-3">{missing.reason}</p>

                      {missing.requires_user_action && (
                        <div className="bg-[#F1F6FB] p-3 rounded-lg border border-[#DCE7F0]">
                          <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                            {missing.prompt_question}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={`Enter ${missing.label.toLowerCase()}...`}
                              value={userCorrections[missing.field_key] || ""}
                              onChange={(e) => handleCorrectionChange(missing.field_key, e.target.value)}
                              className="flex-1 bg-white border border-[#DCE7F0] rounded-lg px-3 py-1.5 text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D]"
                            />
                            <button
                              onClick={() => {
                                if (userCorrections[missing.field_key]) {
                                  setSuccessMessage(`Recorded ${missing.label}: ${userCorrections[missing.field_key]}`);
                                }
                              }}
                              className="px-3 py-1.5 bg-[#172F4D] hover:bg-[#1D3B60] text-white text-xs font-semibold rounded-lg transition-colors shadow-card"
                            >
                              Save Field
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 3: Inconsistency & Discrepancy Detection */}
          {(activeTab === "all" || activeTab === "conflicts") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Inconsistency & Discrepancy Detection Across Screenshots ({report.inconsistencies.length})
                </h3>
                <span className="text-xs text-[#71849A]">
                  Cross-evidence multi-file comparison
                </span>
              </div>

              {report.inconsistencies.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-card">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>No conflicting values detected across uploaded screenshots. All evidence aligns consistently.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.inconsistencies.map((inc) => (
                    <div
                      key={inc.field_key}
                      className="bg-white rounded-xl p-4 border border-red-200 shadow-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(inc.severity)}
                          <h4 className="text-sm font-bold text-[#172F4D]">{inc.label}</h4>
                        </div>
                        <span className="text-xs text-red-600 font-mono font-bold">Discrepancy</span>
                      </div>

                      <p className="text-xs text-red-900 leading-relaxed font-medium">
                        {inc.discrepancy_description}
                      </p>

                      {/* Side-by-side evidence comparison cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {inc.evidence_sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="bg-[#F1F6FB] p-3 rounded-lg border border-[#DCE7F0] flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#71849A] mb-1">
                              <span className="truncate max-w-[160px] font-mono">{src.file_name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#DCE7F0] text-[#172F4D] font-medium">
                                {src.category || "SCREENSHOT"}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-[#172F4D] break-all my-1 font-mono">
                              {inc.field_key === "amount" ? `₹ ${Number(src.value).toLocaleString("en-IN")}` : String(src.value)}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#71849A] mt-1">
                              <span>Confidence: {Math.round(src.confidence * 100)}%</span>
                              <button
                                onClick={() => handleCorrectionChange(inc.field_key, String(src.value))}
                                className="text-[#172F4D] hover:underline font-bold"
                              >
                                Select this value
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {inc.suggested_resolution && (
                        <div className="bg-[#E1F1FB] p-2.5 rounded-lg border border-[#DCE7F0] flex items-start gap-2 text-xs text-[#172F4D]">
                          <Info className="w-4 h-4 text-[#172F4D] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-[#172F4D]">Recommended Resolution: </span>
                            {inc.suggested_resolution}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 4: Information Requiring Citizen Confirmation */}
          {(activeTab === "all" || activeTab === "confirm_needed") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#172F4D]" />
                  Information Requiring Citizen Confirmation ({report.confirmation_needed.length})
                </h3>
                <span className="text-xs text-[#71849A]">
                  Human-in-the-loop integrity review
                </span>
              </div>

              {report.confirmation_needed.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-[#DCE7F0] text-[#71849A] text-xs shadow-card">
                  No additional confirmation required from complainant at this stage.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.confirmation_needed.map((item) => (
                    <div
                      key={item.field_key}
                      className="bg-white rounded-xl p-3.5 border border-[#DCE7F0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-[#172F4D]">{item.label}</h4>
                          <span className="text-[10px] text-[#71849A] font-mono">
                            Detected: {String(item.current_value)}
                          </span>
                        </div>
                        <p className="text-xs text-[#172F4D]">{item.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            handleCorrectionChange(item.field_key, String(item.suggested_value || item.current_value));
                            setSuccessMessage(`Confirmed ${item.label}`);
                          }}
                          className="px-3 py-1.5 bg-[#172F4D] hover:bg-[#1D3B60] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-card"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirm as Accurate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 5: Evidence Quality & Duplicate Analysis */}
          {(activeTab === "all" || activeTab === "quality") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#172F4D]" />
                  Evidence Quality & Duplicate Warnings ({report.quality_issues.length + report.duplicate_transactions.length})
                </h3>
                <span className="text-xs text-[#71849A]">
                  Optical blur, OCR density, duplicate file hashes
                </span>
              </div>

              {report.quality_issues.length === 0 && report.duplicate_transactions.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-card">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>All uploaded evidence screenshots exhibit high sharpness, clear OCR readability, and zero duplicate files.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Quality issues */}
                  {report.quality_issues.map((iss, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-card ${
                        iss.severity === "CRITICAL"
                          ? "bg-red-50/50 border-red-200 text-red-900"
                          : "bg-white border-[#DCE7F0] text-[#172F4D]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(iss.severity)}
                          <span className="text-xs font-bold text-[#172F4D] uppercase tracking-wider font-mono">
                            {iss.issue_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-[#71849A] font-mono">({iss.file_name})</span>
                        </div>
                        <p className="text-xs text-[#71849A]">{iss.message}</p>
                      </div>

                      {iss.metric && (
                        <div className="text-[11px] font-mono px-2 py-1 rounded bg-[#F1F6FB] border border-[#DCE7F0] text-[#172F4D] whitespace-nowrap font-semibold">
                          {iss.metric}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Duplicate transaction / file items */}
                  {report.duplicate_transactions.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-card"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-200 text-amber-900 border border-amber-300">
                            DUPLICATE DETECTION
                          </span>
                          <span className="text-xs font-bold text-amber-950">
                            {dup.is_identical_file ? "Identical Evidence File Uploaded" : "Repeated UTR Transaction"}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800">{dup.explanation}</p>
                      </div>
                      <span className="text-[11px] text-amber-900 font-mono px-2 py-1 rounded bg-white border border-amber-200">
                        {dup.file_names.length} instances
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CITIZEN CONFIRMATION & VERIFICATION SEAL PORTAL */}
          <div className="mt-8 bg-white rounded-xl p-5 border border-[#DCE7F0] shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E1F1FB] border border-[#DCE7F0] flex items-center justify-center text-[#172F4D]">
                <Lock className="w-5 h-5 text-[#172F4D]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#172F4D]">Citizen Evidence Verification & Seal</h3>
                <p className="text-xs text-[#71849A]">
                  The AI does not silently overwrite evidence. Confirm your verified parameters before filing complaints.
                </p>
              </div>
            </div>

            {/* Custom Notes / Overrides input */}
            <div>
              <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                Complainant Clarifications or Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="E.g., confirmed that the first payment of ₹24,500 was debited directly to Yes Bank VPA via fake electricity link..."
                value={citizenNotes}
                onChange={(e) => setCitizenNotes(e.target.value)}
                className="w-full bg-[#F1F6FB] border border-[#DCE7F0] rounded-lg p-2.5 text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D] focus:bg-white"
              />
            </div>

            {/* Citizen Declaration Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={citizenConsent}
                onChange={(e) => setCitizenConsent(e.target.checked)}
                className="mt-0.5 rounded border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] bg-white"
              />
              <span className="text-xs text-[#172F4D] leading-relaxed">
                I hereby declare that the digital evidence and verified transaction details presented above are accurate to the best of my knowledge, and I authorize generating dispute letters for cyber cell and bank lien requests.
              </span>
            </label>

            {/* Confirmation Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-[#71849A]">
                Status: <span className="text-[#172F4D] font-mono font-bold">{report.verification_status}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleConfirmVerification}
                  disabled={!citizenConsent || savingConfirmation}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#172F4D] hover:bg-[#1D3B60] text-white text-xs font-bold rounded-xl transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {savingConfirmation ? "Sealing Verification..." : "Confirm & Seal Case Verification"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
