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
  confirmCaseVerification, 
  fetchTestVerificationScenario 
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

  async function loadTestScenario(type: "complete" | "incomplete" | "conflicting" | "blurry_duplicate") {
    setLoading(true);
    setActiveScenario(type);
    setSuccessMessage(null);
    try {
      const res = await fetchTestVerificationScenario(type);
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Error loading test scenario", err);
    } finally {
      setLoading(false);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            EVIDENCE VERIFIED & SEALED
          </span>
        );
      case "HIGH_DISCREPANCY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            HIGH DISCREPANCY DETECTED
          </span>
        );
      case "ACTION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            CITIZEN ACTION REQUIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            IN REVIEW
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">INFO</span>;
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-white">Running Smart Evidence Verification Engine...</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          Cross-checking receipts, comparing transaction amounts across screenshots, analyzing image blur, and detecting inconsistencies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/cases`}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Back to Cases"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 tracking-wider">MODULE 4 ENGINE</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{report?.case_number}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Smart Evidence Verification
              {report && getStatusBadge(report.verification_status)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}`}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Case Tracker (M7)
          </Link>
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}/complaints`}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <FileText className="w-3.5 h-3.5 text-slate-950" />
            Generate Complaints (Module 6)
          </Link>
          <Link
            href={`/dashboard/cases/${report?.case_id || caseId}/extraction`}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            AI Raw Extractions
          </Link>
          <button
            onClick={handleReverify}
            disabled={reverifying}
            className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-medium border border-purple-500/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reverifying ? "animate-spin" : ""}`} />
            {reverifying ? "Verifying..." : "Re-Verify Case"}
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory & Legal Disclaimer Alert */}
      <div className="rounded-xl p-4 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 shadow-lg">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-300">IMPORTANT LEGAL & VERIFICATION NOTICE: </span>
            A complete case does not mean the fraud is proven. Verification only evaluates the quality, completeness, and cross-consistency of submitted digital evidence for police filing and bank lien requests.
          </div>
        </div>
      </div>

      {/* Test Scenarios Interactive Switcher */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Verification Test Bench (Demonstrate Module 4 Features)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Test complete, incomplete, conflicting, and blurry/duplicate fictional cases
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => loadTestScenario("complete")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex flex-col gap-1 ${
              activeScenario === "complete"
                ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Complete Case
            </span>
            <span className="text-[10px] text-slate-400">Consistent PhonePe + SMS</span>
          </button>

          <button
            onClick={() => loadTestScenario("incomplete")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex flex-col gap-1 ${
              activeScenario === "incomplete"
                ? "bg-amber-950/40 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              2. Incomplete Case
            </span>
            <span className="text-[10px] text-slate-400">Missing UTR & Recipient Bank</span>
          </button>

          <button
            onClick={() => loadTestScenario("conflicting")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex flex-col gap-1 ${
              activeScenario === "conflicting"
                ? "bg-rose-950/40 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/30"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              3. Conflicting Case
            </span>
            <span className="text-[10px] text-slate-400">Mismatched amounts & UTRs</span>
          </button>

          <button
            onClick={() => loadTestScenario("blurry_duplicate")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex flex-col gap-1 ${
              activeScenario === "blurry_duplicate"
                ? "bg-purple-950/40 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              4. Blurry & Duplicate
            </span>
            <span className="text-[10px] text-slate-400">Low OCR tokens + Redundant file</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {report && (
        <>
          {/* Verification Scores Dashboard Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow relative overflow-hidden">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Overall Verification Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${
                  report.overall_score >= 80 ? "text-emerald-400" :
                  report.overall_score >= 60 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {report.overall_score}%
                </span>
                <span className="text-xs text-slate-500">reliability</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    report.overall_score >= 80 ? "bg-emerald-500" :
                    report.overall_score >= 60 ? "bg-amber-500" : "bg-rose-500"
                  }`} 
                  style={{ width: `${report.overall_score}%` }} 
                />
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Completeness Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-400">{report.completeness_score}%</span>
                <span className="text-xs text-slate-500">essential fields</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${report.completeness_score}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Consistency Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${
                  report.consistency_score >= 80 ? "text-purple-400" : "text-amber-400"
                }`}>
                  {report.consistency_score}%
                </span>
                <span className="text-xs text-slate-500">cross-evidence</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${report.consistency_score}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 shadow">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Evidence Quality
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${
                  report.quality_score >= 80 ? "text-emerald-400" :
                  report.quality_score >= 50 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {report.quality_score}%
                </span>
                <span className="text-xs text-slate-500">sharpness / OCR</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    report.quality_score >= 80 ? "bg-emerald-500" :
                    report.quality_score >= 50 ? "bg-amber-500" : "bg-rose-500"
                  }`} 
                  style={{ width: `${report.quality_score}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Citizen Verification Seal Status */}
          {report.is_citizen_verified && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    Citizen Verified & Cryptographically Locked
                  </h4>
                  <p className="text-xs text-slate-300">
                    Confirmed by {report.verified_by_user || "Citizen Complainant"} on{" "}
                    {report.verified_at ? new Date(report.verified_at).toLocaleString() : "Recent"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded-full border border-emerald-500/30">
                LOCKED FOR DRAFTING
              </span>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-t-lg font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "border-amber-400 text-amber-300 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              All Verification Findings
            </button>
            <button
              onClick={() => setActiveTab("verified")}
              className={`px-3 py-2 rounded-t-lg font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "verified"
                  ? "border-emerald-400 text-emerald-300 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verified Information ({report.verified_fields.length})
            </button>
            <button
              onClick={() => setActiveTab("missing")}
              className={`px-3 py-2 rounded-t-lg font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "missing"
                  ? "border-amber-400 text-amber-300 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Missing Information ({report.missing_fields.length})
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`px-3 py-2 rounded-t-lg font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "conflicts"
                  ? "border-rose-400 text-rose-300 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Inconsistencies & Conflicts ({report.inconsistencies.length})
            </button>
            <button
              onClick={() => setActiveTab("quality")}
              className={`px-3 py-2 rounded-t-lg font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "quality"
                  ? "border-purple-400 text-purple-300 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
              Quality Warnings ({report.quality_issues.length})
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB CONTENT 1: Verified Information Cards                       */}
          {/* ============================================================== */}
          {(activeTab === "all" || activeTab === "verified") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Verified Information (High Confidence & Cross-Evidence Agreement)
                </h3>
                <span className="text-xs text-slate-400">
                  {report.verified_fields.length} parameters verified
                </span>
              </div>

              {report.verified_fields.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  No verified parameters found yet. Upload clear UPI transaction receipts to extract details.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.verified_fields.map((field) => (
                    <div
                      key={field.field_key}
                      className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {field.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {Math.round(field.confidence * 100)}% Match
                          </span>
                        </div>
                        <div className="text-base font-bold text-white mb-2 break-all">
                          {field.field_key === "amount" ? (
                            `₹ ${Number(field.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          ) : (
                            String(field.value)
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Layers className="w-3 h-3 text-amber-400" />
                          {field.source_file_names.length} source file(s)
                        </span>
                        {field.is_cross_verified && (
                          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[10px] border border-blue-500/20">
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

          {/* ============================================================== */}
          {/* TAB CONTENT 2: Missing Information Detection                   */}
          {/* ============================================================== */}
          {(activeTab === "all" || activeTab === "missing") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Missing Information Detection ({report.missing_fields.length})
                </h3>
                <span className="text-xs text-amber-400/90 font-medium">
                  {report.missing_fields.filter(m => m.severity === "CRITICAL").length} Critical missing items
                </span>
              </div>

              {report.missing_fields.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>All essential fraud transaction fields are present in the submitted evidence.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.missing_fields.map((missing) => (
                    <div
                      key={missing.field_key}
                      className={`p-4 rounded-xl border transition-all ${
                        missing.severity === "CRITICAL"
                          ? "bg-rose-950/20 border-rose-500/30"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(missing.severity)}
                          <h4 className="text-sm font-bold text-white">{missing.label}</h4>
                        </div>
                        {missing.requires_user_action && (
                          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" />
                            Citizen Input Required
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mb-3">{missing.reason}</p>

                      {missing.requires_user_action && (
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <label className="block text-xs font-medium text-amber-300 mb-1.5">
                            {missing.prompt_question}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={`Enter ${missing.label.toLowerCase()}...`}
                              value={userCorrections[missing.field_key] || ""}
                              onChange={(e) => handleCorrectionChange(missing.field_key, e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              onClick={() => {
                                if (userCorrections[missing.field_key]) {
                                  setSuccessMessage(`Recorded ${missing.label}: ${userCorrections[missing.field_key]}`);
                                }
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold rounded-lg transition-colors"
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

          {/* ============================================================== */}
          {/* TAB CONTENT 3: Inconsistency & Discrepancy Detection            */}
          {/* ============================================================== */}
          {(activeTab === "all" || activeTab === "conflicts") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Inconsistency & Discrepancy Detection Across Screenshots ({report.inconsistencies.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Cross-evidence multi-file comparison
                </span>
              </div>

              {report.inconsistencies.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>No conflicting values detected across uploaded screenshots. All evidence aligns consistently.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.inconsistencies.map((inc) => (
                    <div
                      key={inc.field_key}
                      className="bg-slate-900/90 rounded-xl p-4 border border-rose-500/40 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(inc.severity)}
                          <h4 className="text-sm font-bold text-white">{inc.label}</h4>
                        </div>
                        <span className="text-xs text-rose-400 font-mono">Discrepancy</span>
                      </div>

                      <p className="text-xs text-rose-200/90 leading-relaxed">
                        {inc.discrepancy_description}
                      </p>

                      {/* Side-by-side evidence comparison cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {inc.evidence_sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="truncate max-w-[160px] font-mono">{src.file_name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {src.category || "SCREENSHOT"}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-amber-300 break-all my-1">
                              {inc.field_key === "amount" ? `₹ ${Number(src.value).toLocaleString("en-IN")}` : String(src.value)}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                              <span>Confidence: {Math.round(src.confidence * 100)}%</span>
                              <button
                                onClick={() => handleCorrectionChange(inc.field_key, String(src.value))}
                                className="text-amber-400 hover:text-amber-300 underline font-semibold"
                              >
                                Select this value
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {inc.suggested_resolution && (
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2 text-xs text-slate-300">
                          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-200">Recommended Resolution: </span>
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

          {/* ============================================================== */}
          {/* TAB CONTENT 4: Information Requiring Citizen Confirmation      */}
          {/* ============================================================== */}
          {(activeTab === "all" || activeTab === "confirm_needed") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  Information Requiring Citizen Confirmation ({report.confirmation_needed.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Human-in-the-loop integrity review
                </span>
              </div>

              {report.confirmation_needed.length === 0 ? (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  No additional confirmation required from complainant at this stage.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.confirmation_needed.map((item) => (
                    <div
                      key={item.field_key}
                      className="bg-slate-900/90 rounded-xl p-3.5 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-white">{item.label}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Detected: {String(item.current_value)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{item.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            handleCorrectionChange(item.field_key, String(item.suggested_value || item.current_value));
                            setSuccessMessage(`Confirmed ${item.label}`);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
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

          {/* ============================================================== */}
          {/* TAB CONTENT 5: Evidence Quality & Duplicate Analysis           */}
          {/* ============================================================== */}
          {(activeTab === "all" || activeTab === "quality") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-400" />
                  Evidence Quality & Duplicate Warnings ({report.quality_issues.length + report.duplicate_transactions.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Optical blur, OCR density, duplicate file hashes
                </span>
              </div>

              {report.quality_issues.length === 0 && report.duplicate_transactions.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>All uploaded evidence screenshots exhibit high sharpness, clear OCR readability, and zero duplicate files.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Quality issues */}
                  {report.quality_issues.map((iss, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        iss.severity === "CRITICAL"
                          ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                          : "bg-slate-900 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(iss.severity)}
                          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            {iss.issue_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">({iss.file_name})</span>
                        </div>
                        <p className="text-xs text-slate-300">{iss.message}</p>
                      </div>

                      {iss.metric && (
                        <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 whitespace-nowrap">
                          {iss.metric}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Duplicate transaction / file items */}
                  {report.duplicate_transactions.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            DUPLICATE DETECTION
                          </span>
                          <span className="text-xs font-bold text-white">
                            {dup.is_identical_file ? "Identical Evidence File Uploaded" : "Repeated UTR Transaction"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{dup.explanation}</p>
                      </div>
                      <span className="text-[11px] text-purple-300 font-mono px-2 py-1 rounded bg-purple-900/30 border border-purple-700/40">
                        {dup.file_names.length} instances
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* CITIZEN CONFIRMATION & VERIFICATION SEAL PORTAL               */}
          {/* ============================================================== */}
          <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 rounded-xl p-5 border border-slate-700/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Citizen Evidence Verification & Seal</h3>
                <p className="text-xs text-slate-400">
                  The AI does not silently overwrite evidence. Confirm your verified parameters before filing complaints.
                </p>
              </div>
            </div>

            {/* Custom Notes / Overrides input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Complainant Clarifications or Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="E.g., confirmed that the first payment of ₹24,500 was debited directly to Yes Bank VPA via fake electricity link..."
                value={citizenNotes}
                onChange={(e) => setCitizenNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Citizen Declaration Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={citizenConsent}
                onChange={(e) => setCitizenConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                I hereby declare that the digital evidence and verified transaction details presented above are accurate to the best of my knowledge, and I authorize generating dispute letters for cyber cell and bank lien requests.
              </span>
            </label>

            {/* Confirmation Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                Status: <span className="text-amber-400 font-mono">{report.verification_status}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleConfirmVerification}
                  disabled={!citizenConsent || savingConfirmation}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
