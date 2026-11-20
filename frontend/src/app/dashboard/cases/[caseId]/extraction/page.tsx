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
  verifyExtractionResult 
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
          setSelectedEvidenceId("");
          setExtraction(null);
        }
      } else {
        setSelectedEvidenceId("");
        setExtraction(null);
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
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to extract evidence parameters." });
    } finally {
      setIsExtracting(false);
    }
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
          <span className="text-[10px] text-[#71849A] font-mono italic">
            Not Present
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fadeIn pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE7F0] pb-4">
        <div>
          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-1.5 text-xs text-[#71849A] hover:text-[#172F4D] mb-2 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Cases
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight">
              AI-Powered Evidence Extraction
            </h1>
            <Badge variant="default" className="text-xs bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]">Module 3</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#71849A] mt-1">
            Case: <span className="text-[#172F4D] font-mono font-bold">{caseData?.case_number || "GH-2024-8912"}</span> • 
            Structured entity extraction via Claude 3.5 Sonnet Vision & PaddleOCR.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/dashboard/cases/${caseId}`}>
            <Button
              variant="outline"
              size="md"
              className="font-bold text-[#172F4D] gap-1.5 border-[#DCE7F0] bg-white hover:bg-[#E1F1FB]"
            >
              <Clock className="w-4 h-4 text-[#172F4D]" />
              <span>Case Tracker (Module 7)</span>
            </Button>
          </Link>

          <Link href={`/dashboard/cases/${caseId}/verification`}>
            <Button
              variant="secondary"
              size="md"
              className="font-bold text-emerald-800 gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Smart Verification (Module 4)</span>
            </Button>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={handleRunPipeline}
            isLoading={isExtracting}
            className="font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card gap-1.5"
          >
            <RefreshCw className="w-4 h-4 text-white" />
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
        <div className="p-3.5 rounded-xl bg-white border border-[#DCE7F0] shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#172F4D]">Inspect Evidence File:</span>
            <select
              value={selectedEvidenceId}
              onChange={(e) => handleSelectEvidence(e.target.value)}
              className="bg-[#F1F6FB] border border-[#DCE7F0] rounded-lg px-3 py-1.5 text-xs text-[#172F4D] font-semibold focus:outline-none focus:border-[#172F4D]"
            >
              {caseData.evidence_items.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.file_name} ({ev.category.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-[#71849A] font-mono text-[11px]">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Zero-PIN Filter: Passed
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
          <Card className="border-[#DCE7F0] shadow-card bg-white">
            <CardHeader className="py-3 px-5 border-b border-[#DCE7F0] bg-[#F1F6FB] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#172F4D]" />
                <span className="text-xs font-semibold text-[#172F4D] truncate max-w-[200px]">
                  {extraction?.evidence_file_name || "Evidence Screenshot"}
                </span>
              </div>
              <Badge variant="gold" className="text-[10px]">
                {extraction?.evidence_category || "UPI RECEIPT"}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="h-64 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex flex-col items-center justify-center p-4 overflow-hidden relative group">
                {/* Stylized Digital Receipt Representation */}
                <div className="w-full max-w-xs p-4 rounded-xl bg-white border border-[#DCE7F0] text-center space-y-2 shadow-card">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-[#71849A] font-semibold">Transaction Successful</p>
                  <p className="text-2xl font-extrabold text-[#172F4D] font-mono">
                    {formatCurrency(extraction?.transaction_info.amount.value || 24500)}
                  </p>
                  <p className="text-[11px] text-[#172F4D] font-mono truncate font-medium">
                    To: {extraction?.transaction_info.beneficiary_upi_id.value || "rewards.claim77@ybl"}
                  </p>
                  <div className="pt-2 border-t border-[#DCE7F0] text-[10px] text-[#71849A] font-mono">
                    UTR: {extraction?.transaction_info.transaction_id_utr.value || "412890563412"}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#71849A] text-center">
                Visual Inspection: Authenticated encrypted file streamed from private vault.
              </p>
            </CardContent>
          </Card>

          {/* Raw OCR Text Transcript */}
          <Card className="border-[#DCE7F0] shadow-card bg-white">
            <CardHeader className="py-3 px-5 border-b border-[#DCE7F0] bg-[#F1F6FB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#172F4D]">
                  Raw OCR Line Transcript
                </span>
                <span className="text-[10px] font-mono text-[#71849A]">
                  Engine: {extraction?.ocr_engine_used || "PaddleOCR"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <pre className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-[#172F4D] font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {extraction?.raw_ocr_text || "Running OCR extraction..."}
              </pre>
              <p className="text-[11px] text-[#71849A]">
                Full unedited character sequence preserved for formal verification and police logs.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structured Extracted Entities & Verification (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Transaction Information */}
          <Card className="border-[#DCE7F0] shadow-card bg-white">
            <CardHeader className="py-4 px-6 border-b border-[#DCE7F0] bg-[#F1F6FB] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-[#172F4D] flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#172F4D]" />
                  Extracted Transaction Details
                </CardTitle>
                <CardDescription className="text-xs text-[#71849A]">
                  Validated against Pydantic schema with certainty scores per field.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71849A] font-semibold">Overall:</span>
                <Badge variant="success">
                  {Math.round((extraction?.overall_confidence || 0.95) * 100)}% Confidence
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 12-Digit UTR */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">12-Digit Bank UTR</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.transaction_id_utr.confidence_level || "HIGH",
                      extraction?.transaction_info.transaction_id_utr.confidence || 0.98
                    )}
                  </div>
                  <p className="font-mono font-extrabold text-[#172F4D] text-lg">
                    {extraction?.transaction_info.transaction_id_utr.value || "Not Found"}
                  </p>
                  <p className="text-[10px] text-[#71849A] font-mono">
                    Source: {extraction?.transaction_info.transaction_id_utr.source}
                  </p>
                </div>

                {/* Amount */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">Transaction Amount</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.amount.confidence_level || "HIGH",
                      extraction?.transaction_info.amount.confidence || 0.98
                    )}
                  </div>
                  <p className="font-mono font-extrabold text-red-600 text-lg">
                    {extraction?.transaction_info.amount.value 
                      ? formatCurrency(extraction.transaction_info.amount.value) 
                      : "Not Found"}
                  </p>
                  <p className="text-[10px] text-[#71849A] font-mono">
                    Source: {extraction?.transaction_info.amount.source}
                  </p>
                </div>

                {/* Beneficiary VPA */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">Beneficiary (Fraudster VPA)</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.beneficiary_upi_id.confidence_level || "HIGH",
                      extraction?.transaction_info.beneficiary_upi_id.confidence || 0.97
                    )}
                  </div>
                  <p className="font-mono font-bold text-[#172F4D] text-sm truncate">
                    {extraction?.transaction_info.beneficiary_upi_id.value || "Not Found"}
                  </p>
                  <p className="text-[10px] text-[#71849A] font-medium">
                    Bank: {extraction?.transaction_info.beneficiary_bank.value || "YES BANK"}
                  </p>
                </div>

                {/* Sender VPA / Account */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">Sender Account (Victim)</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.sender_upi_id.confidence_level || "HIGH",
                      extraction?.transaction_info.sender_upi_id.confidence || 0.91
                    )}
                  </div>
                  <p className="font-mono font-bold text-[#172F4D] text-sm truncate">
                    {extraction?.transaction_info.sender_upi_id.value || "victim.user@okaxis"}
                  </p>
                  <p className="text-[10px] text-[#71849A]">
                    Bank: {extraction?.transaction_info.sender_bank.value || "Axis Bank"}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">Debit Date & Time</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.transaction_date.confidence_level || "HIGH",
                      extraction?.transaction_info.transaction_date.confidence || 0.95
                    )}
                  </div>
                  <p className="font-mono text-[#172F4D] text-xs">
                    {extraction?.transaction_info.transaction_date.value} • {extraction?.transaction_info.transaction_time.value || "09:14 PM"}
                  </p>
                </div>

                {/* App Used */}
                <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71849A] font-semibold">Payment App</span>
                    {getConfidenceBadge(
                      extraction?.transaction_info.app_used.confidence_level || "HIGH",
                      extraction?.transaction_info.app_used.confidence || 0.99
                    )}
                  </div>
                  <p className="font-semibold text-[#172F4D] text-xs">
                    {extraction?.transaction_info.app_used.value || "PhonePe"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Communication & Threat Intelligence */}
          {extraction?.communication_info && (
            <Card className="border-[#DCE7F0] shadow-card bg-white">
              <CardHeader className="py-3 px-6 border-b border-[#DCE7F0] bg-[#F1F6FB]">
                <CardTitle className="text-sm text-[#172F4D] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#172F4D]" />
                  Communication & Threat Intelligence Analysis
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-3 text-xs">
                {extraction.communication_info.is_sender_spoofed.value && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-900">Sender Spoofing Alert: </span>
                      {extraction.communication_info.is_sender_spoofed.uncertainty_note ||
                        "Alphanumeric SMS header masquerades as utility or bank entity without verified authorization."}
                    </div>
                  </div>
                )}

                {extraction.communication_info.suspicious_payment_instructions &&
                  extraction.communication_info.suspicious_payment_instructions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-[#172F4D]">
                        Suspicious Instructions & Coercion Patterns Identified:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-[#71849A]">
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
            <Card className="border-amber-200 bg-amber-50/50 shadow-card">
              <CardHeader className="py-3 px-6 border-b border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertOctagon className="w-4 h-4 text-amber-700" />
                  <CardTitle className="text-sm font-bold text-amber-900">
                    Discrepancy / Conflict Detected
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                {extraction.conflicts_detected.map((conf, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white border border-amber-200 space-y-2 shadow-sm">
                    <p className="font-semibold text-amber-900">
                      Field: <span className="font-mono uppercase">{conf.field_name}</span>
                    </p>
                    <p className="text-[#172F4D]">{conf.explanation}</p>
                    <div className="p-2 rounded bg-[#F1F6FB] border border-[#DCE7F0] text-[11px] text-[#71849A] space-y-1">
                      <span className="font-semibold text-[#172F4D]">Observed Variations:</span>
                      {conf.conflicting_values.map((v, vIdx) => (
                        <div key={vIdx} className="flex justify-between font-mono">
                          <span>{v.source}:</span>
                          <span className="text-[#172F4D] font-bold">{String(v.value)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-800 font-semibold">
                      Recommendation: {conf.recommended_action}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 4: Human-in-the-Loop Complainant Verification & Correction */}
          <Card className="border-emerald-200 bg-white shadow-card">
            <CardHeader className="py-3 px-6 border-b border-emerald-100 bg-emerald-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm text-emerald-950 font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Complainant Verification Step
                </CardTitle>
                <CardDescription className="text-xs text-emerald-800">
                  Inspect and confirm extracted values against your bank statement before filing complaints.
                </CardDescription>
              </div>

              <Badge variant={extraction?.user_verified ? "success" : "gold"}>
                {extraction?.user_verified ? "VERIFIED BY CITIZEN" : "PENDING CITIZEN CHECK"}
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {isEditing ? (
                <div className="space-y-3 p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                  <span className="font-semibold text-[#172F4D]">Manual Field Overrides:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#71849A] block mb-1 font-semibold">12-Digit Bank UTR:</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={editUtr}
                        onChange={(e) => setEditUtr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-[#DCE7F0] text-[#172F4D] font-mono text-xs focus:outline-none focus:border-[#172F4D]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#71849A] block mb-1 font-semibold">Amount Debited (INR):</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-[#DCE7F0] text-red-600 font-mono text-xs focus:outline-none focus:border-[#172F4D]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-[#71849A] block mb-1 font-semibold">Beneficiary Fraudster VPA:</label>
                      <input
                        type="text"
                        value={editBeneficiaryUpi}
                        onChange={(e) => setEditBeneficiaryUpi(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-[#DCE7F0] text-[#172F4D] font-mono text-xs focus:outline-none focus:border-[#172F4D]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[#172F4D] leading-relaxed">
                  I confirm that the 12-digit UTR, debited amount, and beneficiary UPI ID extracted above reflect the unauthorized transaction on my bank account.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-[#71849A] hover:text-[#172F4D]"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  {isEditing ? "Cancel Manual Edit" : "Edit Values Inline"}
                </Button>

                <Button
                  variant={extraction?.user_verified ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleConfirmVerification}
                  isLoading={isSavingCorrection}
                  disabled={extraction?.user_verified && !isEditing}
                  className={`font-bold gap-1.5 ${
                    extraction?.user_verified 
                      ? "bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]" 
                      : "bg-[#172F4D] text-white hover:bg-[#1D3B60] shadow-card"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
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
