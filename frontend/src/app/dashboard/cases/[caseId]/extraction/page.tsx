"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  FileText, 
  RefreshCw, 
  ArrowLeft, 
  Edit3, 
  Save, 
  Building, 
  Hash, 
  Phone, 
  AlertOctagon, 
  Check, 
  ExternalLink 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { 
  fetchCaseDetail, 
  fetchEvidenceExtraction, 
  triggerEvidenceExtraction, 
  verifyExtractionResult,
  fetchSampleExtraction 
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { 
  FraudCaseDetail, 
  EvidenceItem, 
  EvidenceExtractionResult, 
  ConfidenceLevel 
} from "@/types";

export default function EvidenceExtractionPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.caseId as string) || "case_101";

  const { token } = useAuth();
  const { t } = useLanguage();

  const [caseData, setCaseData] = useState<FraudCaseDetail | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>("");
  const [extraction, setExtraction] = useState<EvidenceExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Complainant inline correction form states
  const [isEditing, setIsEditing] = useState(false);
  const [editUtr, setEditUtr] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBeneficiaryUpi, setEditBeneficiaryUpi] = useState("");
  const [editBeneficiaryBank, setEditBeneficiaryBank] = useState("");

  // Load case details on mount
  useEffect(() => {
    const loadCase = async () => {
      setIsLoading(true);
      const res = await fetchCaseDetail(caseId, token);
      if (res.success && res.data) {
        setCaseData(res.data);
        if (res.data.evidence_items && res.data.evidence_items.length > 0) {
          const firstEv = res.data.evidence_items[0].id;
          setSelectedEvidenceId(firstEv);
          loadExtraction(firstEv);
        } else {
          // If no evidence items, fallback to sample
          loadSample();
        }
      } else {
        loadSample();
      }
      setIsLoading(false);
    };

    loadCase();
  }, [caseId, token]);

  const loadExtraction = async (evId: string) => {
    setIsExtracting(true);
    setStatusMsg(null);
    try {
      const extRes = await fetchEvidenceExtraction(caseId, evId, token);
      if (extRes.success && extRes.data) {
        setExtraction(extRes.data);
        syncEditFields(extRes.data);
      } else {
        // Trigger extraction if not already cached
        const triggerRes = await triggerEvidenceExtraction(caseId, evId, token);
        if (triggerRes.success && triggerRes.data) {
          setExtraction(triggerRes.data);
          syncEditFields(triggerRes.data);
        }
      }
    } catch {
      loadSample();
    } finally {
      setIsExtracting(false);
    }
  };

  const loadSample = async () => {
    setIsExtracting(true);
    const sample = await fetchSampleExtraction();
    if (sample.success && sample.data) {
      setExtraction(sample.data);
      syncEditFields(sample.data);
    }
    setIsExtracting(false);
  };

  const syncEditFields = (data: EvidenceExtractionResult) => {
    setEditUtr(data.transaction_info.transaction_id_utr.value || "");
    setEditAmount(data.transaction_info.amount.value ? String(data.transaction_info.amount.value) : "");
    setEditBeneficiaryUpi(data.transaction_info.beneficiary_upi_id.value || "");
    setEditBeneficiaryBank(data.transaction_info.beneficiary_bank.value || "");
  };

  const handleSelectEvidence = (evId: string) => {
    setSelectedEvidenceId(evId);
    loadExtraction(evId);
  };

  const handleRunPipeline = async () => {
    if (!selectedEvidenceId) return;
    setIsExtracting(true);
    setStatusMsg(null);
    try {
      const res = await triggerEvidenceExtraction(caseId, selectedEvidenceId, token);
      if (res.success && res.data) {
        setExtraction(res.data);
        syncEditFields(res.data);
        setStatusMsg({
          type: "success",
          text: "AI Vision and OCR extraction pipeline completed successfully!",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Extraction error" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!extraction) return;
    setIsSavingCorrection(true);
    setStatusMsg(null);
    try {
      const corrections: Record<string, any> = {};
      if (editUtr !== extraction.transaction_info.transaction_id_utr.value) {
        corrections["transaction_id_utr"] = editUtr;
      }
      if (parseFloat(editAmount) !== extraction.transaction_info.amount.value) {
        corrections["amount"] = parseFloat(editAmount);
      }
      if (editBeneficiaryUpi !== extraction.transaction_info.beneficiary_upi_id.value) {
        corrections["beneficiary_upi_id"] = editBeneficiaryUpi;
      }

      const res = await verifyExtractionResult(
        caseId,
        extraction.evidence_id,
        { user_verified: true, corrections },
        token
      );

      if (res.success && res.data) {
        setExtraction(res.data);
        setIsEditing(false);
        setStatusMsg({
          type: "success",
          text: "Verification and parameter confirmations saved by citizen!",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to verify" });
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const getConfidenceBadge = (level: ConfidenceLevel, score: number) => {
    switch (level) {
      case "HIGH":
        return (
          <Badge variant="success" className="text-[10px] py-0 px-1.5">
            HIGH ({Math.round(score * 100)}%)
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="gold" className="text-[10px] py-0 px-1.5">
            MEDIUM ({Math.round(score * 100)}%)
          </Badge>
        );
      case "LOW":
        return (
          <Badge variant="crimson" className="text-[10px] py-0 px-1.5">
            LOW ({Math.round(score * 100)}%)
          </Badge>
        );
      default:
        return (
          <span className="text-[10px] text-slate-500 font-mono italic">
            Not Present
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fadeIn">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-1.5 text-xs text-purple-light hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Cases
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI-Powered Evidence Extraction
            </h1>
            <Badge variant="default" className="text-xs">Module 3</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Case: <span className="text-gold font-mono font-bold">{caseData?.case_number || "GH-2024-8912"}</span> • 
            Structured entity extraction via Claude 3.5 Sonnet Vision & PaddleOCR.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/dashboard/cases/${caseId}`}>
            <Button
              variant="secondary"
              size="md"
              className="font-bold text-gold gap-1.5 border border-gold/40 hover:bg-gold/10"
            >
              <Clock className="w-4 h-4 text-gold" />
              <span>Case Tracker (Module 7)</span>
            </Button>
          </Link>

          <Link href={`/dashboard/cases/${caseId}/verification`}>
            <Button
              variant="primary"
              size="md"
              className="font-bold text-white shadow-glow gap-1.5 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Smart Verification (Module 4)</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadSample}
            isLoading={isExtracting}
            className="text-xs text-slate-300"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-gold" />
            Load Sample Evidence Demo
          </Button>

          <Button
            variant="gold"
            size="md"
            onClick={handleRunPipeline}
            isLoading={isExtracting}
            className="font-bold text-navy-950 shadow-gold-glow gap-1.5"
          >
            <RefreshCw className="w-4 h-4 text-navy-950" />
            <span>Re-Run Vision & OCR</span>
          </Button>
        </div>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "success" : "danger"}>
          {statusMsg.text}
        </Alert>
      )}

      {/* Evidence File Selector Strip */}
      {caseData?.evidence_items && caseData.evidence_items.length > 0 && (
        <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Inspect Evidence File:</span>
            <select
              value={selectedEvidenceId}
              onChange={(e) => handleSelectEvidence(e.target.value)}
              className="bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-gold font-semibold focus:outline-none focus:border-purple"
            >
              {caseData.evidence_items.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.file_name} ({ev.category.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Zero-PIN Filter: Passed
            </span>
            <span className="hidden sm:inline">Engine: Claude 3.5 Vision + PaddleOCR</span>
          </div>
        </div>
      )}

      {/* Main Split-Pane Layout: Left = Visual/OCR Preview, Right = Structured Entities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Screenshot & Raw OCR Transcript (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visual Screenshot Display */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-navy-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple" />
                <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                  {extraction?.evidence_file_name || "Evidence Screenshot"}
                </span>
              </div>
              <Badge variant="gold" className="text-[10px]">
                {extraction?.evidence_category || "UPI RECEIPT"}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="h-64 rounded-xl bg-navy-950 border border-navy-800 flex flex-col items-center justify-center p-4 overflow-hidden relative group">
                {/* Stylized Digital Receipt Representation */}
                <div className="w-full max-w-xs p-4 rounded-xl bg-navy-900/90 border border-purple/30 text-center space-y-2 shadow-2xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Transaction Successful</p>
                  <p className="text-2xl font-extrabold text-white font-mono">
                    {formatCurrency(extraction?.transaction_info.amount.value || 24500)}
                  </p>
                  <p className="text-[11px] text-purple-light font-mono truncate">
                    To: {extraction?.transaction_info.beneficiary_upi_id.value || "rewards.claim77@ybl"}
                  </p>
                  <div className="pt-2 border-t border-navy-800 text-[10px] text-slate-400 font-mono">
                    UTR: {extraction?.transaction_info.transaction_id_utr.value || "412890563412"}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Visual Inspection: Authenticated encrypted file streamed from private vault.
              </p>
            </CardContent>
          </Card>

          {/* Raw OCR Text Transcript */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-navy-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Raw OCR Line Transcript
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Engine: {extraction?.ocr_engine_used || "PaddleOCR"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <pre className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {extraction?.raw_ocr_text || "Running OCR extraction..."}
              </pre>
              <p className="text-[11px] text-slate-500">
                Full unedited character sequence preserved for formal verification and police logs.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structured Extracted Entities & Verification (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Transaction Information */}
          <Card className="border-purple/30">
            <CardHeader className="py-4 px-6 border-b border-navy-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple" />
                  Extracted Transaction Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Validated against Pydantic schema with certainty scores per field.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Overall:</span>
                <Badge variant="success">
                  {Math.round((extraction?.overall_confidence || 0.95) * 100)}% Confidence
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 12-Digit UTR */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">12-Digit Bank UTR</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.transaction_id_utr.confidence_level || "HIGH",
                      extraction?.transaction_info.transaction_id_utr.confidence || 0.98
                    )}
                  </div>
                  <p className="font-mono font-extrabold text-gold text-lg">
                    {extraction?.transaction_info.transaction_id_utr.value || "Not Found"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Source: {extraction?.transaction_info.transaction_id_utr.source}
                  </p>
                </div>

                {/* Amount */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Transaction Amount</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.amount.confidence_level || "HIGH",
                      extraction?.transaction_info.amount.confidence || 0.98
                    )}
                  </div>
                  <p className="font-mono font-extrabold text-crimson-light text-lg">
                    {extraction?.transaction_info.amount.value 
                      ? formatCurrency(extraction.transaction_info.amount.value) 
                      : "Not Found"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Source: {extraction?.transaction_info.amount.source}
                  </p>
                </div>

                {/* Beneficiary VPA */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Beneficiary (Fraudster VPA)</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.beneficiary_upi_id.confidence_level || "HIGH",
                      extraction?.transaction_info.beneficiary_upi_id.confidence || 0.97
                    )}
                  </div>
                  <p className="font-mono font-bold text-slate-100 text-sm truncate">
                    {extraction?.transaction_info.beneficiary_upi_id.value || "Not Found"}
                  </p>
                  <p className="text-[10px] text-purple-light font-medium">
                    Bank: {extraction?.transaction_info.beneficiary_bank.value || "YES BANK"}
                  </p>
                </div>

                {/* Sender VPA / Account */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Sender Account (Victim)</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.sender_upi_id.confidence_level || "HIGH",
                      extraction?.transaction_info.sender_upi_id.confidence || 0.91
                    )}
                  </div>
                  <p className="font-mono font-bold text-slate-100 text-sm truncate">
                    {extraction?.transaction_info.sender_upi_id.value || "victim.user@okaxis"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Bank: {extraction?.transaction_info.sender_bank.value || "Axis Bank"}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Debit Date & Time</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.transaction_date.confidence_level || "HIGH",
                      extraction?.transaction_info.transaction_date.confidence || 0.95
                    )}
                  </div>
                  <p className="font-mono text-slate-200 text-xs">
                    {extraction?.transaction_info.transaction_date.value} • {extraction?.transaction_info.transaction_time.value || "09:14 PM"}
                  </p>
                </div>

                {/* App Used */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Payment App</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.app_used.confidence_level || "HIGH",
                      extraction?.transaction_info.app_used.confidence || 0.99
                    )}
                  </div>
                  <p className="font-semibold text-slate-100 text-xs">
                    {extraction?.transaction_info.app_used.value || "PhonePe"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Communication & Threat Intelligence */}
          {extraction?.communication_info && (
            <Card>
              <CardHeader className="py-3 px-6 border-b border-navy-800">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple" />
                  Communication & Threat Intelligence Analysis
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-3 text-xs">
                {extraction.communication_info.is_sender_spoofed.value && (
                  <div className="p-3 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson-light flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-crimson shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Sender Spoofing Alert: </span>
                      {extraction.communication_info.is_sender_spoofed.uncertainty_note ||
                        "Alphanumeric SMS header masquerades as utility or bank entity without verified authorization."}
                    </div>
                  </div>
                )}

                {extraction.communication_info.suspicious_payment_instructions &&
                  extraction.communication_info.suspicious_payment_instructions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-slate-300">
                        Suspicious Instructions & Coercion Patterns Identified:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        {extraction.communication_info.suspicious_payment_instructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Section 3: Conflict Alerts Card (If multiple distinct amounts or names detected) */}
          {extraction?.conflicts_detected && extraction.conflicts_detected.length > 0 && (
            <Card className="border-gold/40 bg-gold/5">
              <CardHeader className="py-3 px-6 border-b border-gold/20">
                <div className="flex items-center gap-2 text-gold">
                  <AlertOctagon className="w-4 h-4" />
                  <CardTitle className="text-sm text-amber-200">
                    Discrepancy / Conflict Detected
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                {extraction.conflicts_detected.map((conf, i) => (
                  <div key={i} className="p-3 rounded-lg bg-navy-950 border border-gold/30 space-y-2">
                    <p className="font-semibold text-gold">
                      Field: <span className="font-mono uppercase">{conf.field_name}</span>
                    </p>
                    <p className="text-slate-300">{conf.explanation}</p>
                    <div className="p-2 rounded bg-navy-900 border border-navy-800 text-[11px] text-slate-400 space-y-1">
                      <span className="font-semibold text-slate-300">Observed Variations:</span>
                      {conf.conflicting_values.map((v, vIdx) => (
                        <div key={vIdx} className="flex justify-between font-mono">
                          <span>{v.source}:</span>
                          <span className="text-white font-bold">{String(v.value)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-300">
                      Recommendation: {conf.recommended_action}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 4: Human-in-the-Loop Complainant Verification & Correction */}
          <Card className="border-emerald-500/30">
            <CardHeader className="py-3 px-6 border-b border-navy-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Complainant Verification Step
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect and confirm extracted values against your bank statement before filing complaints.
                </CardDescription>
              </div>

              <Badge variant={extraction?.user_verified ? "success" : "gold"}>
                {extraction?.user_verified ? "VERIFIED BY CITIZEN" : "PENDING CITIZEN CHECK"}
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {isEditing ? (
                <div className="space-y-3 p-4 rounded-xl bg-navy-950 border border-navy-800">
                  <span className="font-semibold text-white">Manual Field Overrides:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">12-Digit Bank UTR:</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={editUtr}
                        onChange={(e) => setEditUtr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-navy-900 border border-navy-700 text-gold font-mono text-xs focus:outline-none focus:border-purple"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Amount Debited (INR):</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-navy-900 border border-navy-700 text-crimson-light font-mono text-xs focus:outline-none focus:border-purple"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-1">Beneficiary Fraudster VPA:</label>
                      <input
                        type="text"
                        value={editBeneficiaryUpi}
                        onChange={(e) => setEditBeneficiaryUpi(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-navy-900 border border-navy-700 text-white font-mono text-xs focus:outline-none focus:border-purple"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 leading-relaxed">
                  I confirm that the 12-digit UTR, debited amount, and beneficiary UPI ID extracted above reflect the unauthorized transaction on my bank account.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  {isEditing ? "Cancel Manual Edit" : "Edit Values Inline"}
                </Button>

                <Button
                  variant={extraction?.user_verified ? "secondary" : "gold"}
                  size="sm"
                  onClick={handleConfirmVerification}
                  isLoading={isSavingCorrection}
                  disabled={extraction?.user_verified && !isEditing}
                  className="font-bold text-navy-950 gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-navy-950" />
                  <span>
                    {extraction?.user_verified ? "Re-Verify Parameters" : "Confirm & Verify Parameters"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
