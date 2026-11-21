"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Eye, 
  X, 
  Plus, 
  Calendar, 
  Phone, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  Lock,
  RefreshCw,
  Info,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Terminal,
  Code2,
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { analyzeEvidenceIntake, createFraudCase } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { IntakeAnalysisResult, FraudCaseDetail } from "@/types";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ReportFraudPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { t } = useLanguage();

  // Step 1: Upload Screenshots state
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 & 3: AI Extraction state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [intakeResult, setIntakeResult] = useState<IntakeAnalysisResult | null>(null);

  // Step 4 & 5: Incident Details & Manual Defrauded Amount
  const [amountDefrauded, setAmountDefrauded] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Developer Diagnostics State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);

  // Step 6: Case Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<FraudCaseDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image Preview Modal
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalName, setPreviewModalName] = useState<string>("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFilesSelected = (fileList: FileList | File[]) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    const maxSizeBytes = 15 * 1024 * 1024;
    const newItems: QueuedFile[] = [];

    Array.from(fileList).forEach((file) => {
      if (!allowed.includes(file.type.toLowerCase())) {
        setErrorMsg(`"${file.name}" is not supported. Supported: PNG, JPG, JPEG, WEBP, PDF.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorMsg(`"${file.name}" exceeds 15MB limit.`);
        return;
      }
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      newItems.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
      });
    });

    if (newItems.length > 0) {
      setQueuedFiles((prev) => [...prev, ...newItems]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered;
    });
  };

  // Trigger AI Extraction on Uploaded Screenshots
  const handleExtractWithAI = async () => {
    if (queuedFiles.length === 0) {
      setErrorMsg("Please select at least one fraud screenshot to analyze.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisProgress("Uploading evidence screenshots to secure private vault...");

    try {
      const filesToUpload = queuedFiles.map((q) => q.file);
      setAnalysisProgress("Running Claude Vision & OCR extraction across screenshots...");
      
      const res = await analyzeEvidenceIntake(filesToUpload, token);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || "Failed to extract incident details from screenshots.");
      }

      setIntakeResult(res.data);
      setCustomTitle(res.data.incident_title);
      setCustomDescription(res.data.incident_description);
      setSelectedCategory(res.data.scam_category);
      if (res.data.suggested_amount) {
        setAmountDefrauded(String(res.data.suggested_amount));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "AI extraction failed. Please try again or re-upload clear screenshots.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress("");
    }
  };

  // Submit Fraud Case
  const handleSubmitCase = async () => {
    if (!intakeResult) {
      setErrorMsg("Please upload screenshots and run AI extraction first.");
      return;
    }

    const numAmount = parseFloat(amountDefrauded);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter the valid defrauded amount (INR) debited from your account.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const evidenceIds = intakeResult.uploaded_evidence.map((e) => e.evidence_id);
      const payload = {
        title: customTitle || intakeResult.incident_title,
        fraud_category: selectedCategory || intakeResult.scam_category,
        fraud_description: customDescription || intakeResult.incident_description,
        incident_date: intakeResult.transaction_date_time || new Date().toISOString(),
        amount_lost: numAmount,
        transaction_id_utr: intakeResult.transaction_id_utr || undefined,
        beneficiary_upi_id: intakeResult.beneficiary_upi_id || undefined,
        beneficiary_bank: intakeResult.beneficiary_bank || undefined,
        fraudster_phone: intakeResult.fraudster_phone || undefined,
        preferred_language: user?.preferred_language || "en",
        contact_phone: user?.phone_number || "",
        contact_email: user?.email || "",
        evidence_ids: evidenceIds,
      };

      const res = await createFraudCase(payload, token);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || "Failed to create fraud case.");
      }

      setCreatedCase(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create fraud case. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn pb-16">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight">
            Report a Fraud Incident
          </h1>
          <p className="text-xs sm:text-sm text-[#71849A] mt-1">
            Upload screenshots of your UPI receipts, bank debits, or scammer chats. Our AI extracts transaction parameters automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0] px-3 py-1 flex items-center gap-1.5 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5 text-[#172F4D]" />
            Golden Hour Protocol Active
          </Badge>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Attention Required</span>
            <p className="text-red-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Case Created Success Card */}
      {createdCase ? (
        <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
          <div className="bg-[#E1F1FB] p-6 border-b border-[#DCE7F0]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#172F4D] flex items-center justify-center text-white">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#172F4D]">
                  Fraud Case Registered Successfully
                </h3>
                <p className="text-xs text-[#71849A]">
                  Case Reference: <span className="font-semibold text-[#172F4D]">{createdCase.case_number}</span>
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                <span className="text-[11px] font-medium text-[#71849A] uppercase tracking-wider block">Amount Defrauded</span>
                <span className="text-base font-bold text-[#172F4D] mt-1 block">
                  {formatCurrency(createdCase.amount_lost)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                <span className="text-[11px] font-medium text-[#71849A] uppercase tracking-wider block">12-Digit UTR</span>
                <span className="text-sm font-bold text-[#172F4D] mt-1 block font-mono">
                  {createdCase.transaction_id_utr || "Pending Bank Verify"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                <span className="text-[11px] font-medium text-[#71849A] uppercase tracking-wider block">Beneficiary UPI VPA</span>
                <span className="text-sm font-semibold text-[#172F4D] mt-1 block truncate">
                  {createdCase.beneficiary_upi_id || "Not Found"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                <span className="text-[11px] font-medium text-[#71849A] uppercase tracking-wider block">Evidence Files Attached</span>
                <span className="text-base font-bold text-[#172F4D] mt-1 block">
                  {createdCase.evidence_count} file(s)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Next Step: Execute the 3-Stage Emergency Response Checklist</p>
                <p className="text-amber-800 text-xs mt-1">
                  Contact the 1930 Cybercrime Helpline immediately and notify your bank branch to request a lien freeze on the beneficiary account before the Golden Hour expires.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => router.push("/dashboard/emergency")}
                className="w-full sm:w-auto bg-[#172F4D] hover:bg-[#263F61] text-white font-semibold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                Open Emergency Response & Case Tracking
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/cases/${createdCase.id}`)}
                className="w-full sm:w-auto border-[#DCE7F0] text-[#172F4D] hover:bg-[#F1F6FB] px-6 py-2.5 rounded-xl font-medium"
              >
                View Case Dossier
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* STEP 1: SCREENSHOT UPLOAD AS MAIN INPUT */}
          <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-[#F1F6FB]/70 border-b border-[#DCE7F0] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#172F4D] text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-[#172F4D]">
                      Upload Fraud Screenshots & Evidence
                    </CardTitle>
                    <CardDescription className="text-xs text-[#71849A]">
                      Main Input: Upload UPI payment receipts, bank debit SMS, or WhatsApp conversations.
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-white text-[#172F4D] border-[#DCE7F0] text-[11px] font-semibold">
                  Primary Input
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? "border-[#172F4D] bg-[#E1F1FB]"
                    : "border-[#DCE7F0] hover:border-[#172F4D] bg-[#F1F6FB]/40 hover:bg-[#E1F1FB]/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-[#E1F1FB] border border-[#DCE7F0] flex items-center justify-center mx-auto mb-4 text-[#172F4D]">
                  <UploadCloud className="w-7 h-7 text-[#172F4D]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#172F4D]">
                  Drop fraud screenshots here, or click to browse
                </h3>
                <p className="text-xs text-[#71849A] mt-1 max-w-md mx-auto">
                  Supports PhonePe, Google Pay, Paytm, BHIM, bank statements, SMS alerts, and WhatsApp chat screenshots (PNG, JPG, PDF up to 15MB).
                </p>
                <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-[#71849A]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> End-to-End Encrypted
                  </span>
                  <span>•</span>
                  <span>Zero Credentials Stored</span>
                  <span>•</span>
                  <span>Automatic Redaction</span>
                </div>
              </div>

              {/* Uploaded Files Queue Preview */}
              {queuedFiles.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#172F4D] uppercase tracking-wider">
                      Selected Evidence Files ({queuedFiles.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {queuedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex items-center gap-3 relative group"
                      >
                        {item.previewUrl ? (
                          <div
                            onClick={() => {
                              setPreviewModalUrl(item.previewUrl);
                              setPreviewModalName(item.file.name);
                            }}
                            className="w-12 h-12 rounded-lg bg-white border border-[#DCE7F0] overflow-hidden shrink-0 cursor-pointer relative"
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#E1F1FB] border border-[#DCE7F0] flex items-center justify-center shrink-0 text-[#172F4D]">
                            <FileText className="w-5 h-5 text-[#172F4D]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#172F4D] truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-[#71849A]">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="p-1.5 rounded-lg hover:bg-white text-[#71849A] hover:text-red-600 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Extract with AI Action Button */}
                  <div className="pt-3">
                    <Button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={handleExtractWithAI}
                      className="w-full sm:w-auto bg-[#172F4D] hover:bg-[#263F61] text-white font-semibold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing Screenshots with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-sky-300" />
                          Extract Fraud Details with AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {isAnalyzing && (
                <div className="p-4 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0] flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-[#172F4D] animate-spin shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#172F4D]">AI Extraction in Progress</p>
                    <p className="text-xs text-[#71849A]">{analysisProgress}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: EXTRACTED INCIDENT DETAILS (AUTO-FILLED BY AI) */}
          {intakeResult && (
            <div className="space-y-6 animate-fadeIn">
              {/* Conflict Warnings Banner */}
              {intakeResult.conflict_warnings && intakeResult.conflict_warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-red-900">
                      Cross-Evidence Discrepancy Detected
                    </p>
                    {intakeResult.conflict_warnings.map((cw, idx) => (
                      <p key={idx} className="text-red-800 text-xs font-medium">
                        • {cw}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality / Low-Resolution Warnings */}
              {intakeResult.quality_warnings && intakeResult.quality_warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900">
                      Evidence Quality Notice
                    </p>
                    {intakeResult.quality_warnings.map((qw, idx) => (
                      <p key={idx} className="text-amber-800 text-xs">
                        • {qw}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Information Warning Banner */}
              {intakeResult.missing_fields && intakeResult.missing_fields.length > 0 && (
                <div className="p-4 rounded-xl bg-[#E1F1FB] border border-[#BCE1F8] text-[#172F4D] text-xs sm:text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-[#477DA8] mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#172F4D]">
                      Missing Evidence Notice
                    </p>
                    <p className="text-[#477DA8] text-xs">
                      The following field(s) were not detected in the uploaded evidence:{" "}
                      <span className="font-semibold text-[#172F4D]">{intakeResult.missing_fields.join(", ")}</span>.
                      You may upload additional receipts or proceed with bank verification.
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted Details Card */}
              <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#F1F6FB]/70 border-b border-[#DCE7F0] pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#172F4D] text-white flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg font-bold text-[#172F4D]">
                          AI-Extracted Incident Details
                        </CardTitle>
                        <CardDescription className="text-xs text-[#71849A]">
                          Extracted from {intakeResult.uploaded_evidence.length} evidence file(s). Review parameters below.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      AI Extracted
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Grid of Key Technical Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* 12-Digit UTR */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider">
                            12-Digit UTR
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            intakeResult.fields?.transaction_id_utr?.status === "Extracted" || intakeResult.transaction_id_utr
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {intakeResult.fields?.transaction_id_utr?.status || (intakeResult.transaction_id_utr ? "Extracted" : "Needs Review")}
                          </span>
                        </div>
                        {intakeResult.transaction_id_utr ? (
                          <span className="text-sm font-bold text-[#172F4D] mt-1 block font-mono">
                            {intakeResult.transaction_id_utr}
                          </span>
                        ) : (
                          <span className="text-xs text-[#71849A] italic mt-1 block">
                            Not found in uploaded evidence
                          </span>
                        )}
                      </div>
                      {intakeResult.fields?.transaction_id_utr?.source_screenshot && (
                        <span className="text-[10px] text-[#71849A] mt-2 block truncate">
                          Source: {intakeResult.fields.transaction_id_utr.source_screenshot}
                        </span>
                      )}
                    </div>

                    {/* Beneficiary UPI VPA */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider">
                            Beneficiary UPI VPA
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            intakeResult.fields?.beneficiary_upi_id?.status === "Extracted" || intakeResult.beneficiary_upi_id
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {intakeResult.fields?.beneficiary_upi_id?.status || (intakeResult.beneficiary_upi_id ? "Extracted" : "Needs Review")}
                          </span>
                        </div>
                        {intakeResult.beneficiary_upi_id ? (
                          <span className="text-sm font-bold text-[#172F4D] mt-1 block font-mono truncate">
                            {intakeResult.beneficiary_upi_id}
                          </span>
                        ) : (
                          <span className="text-xs text-[#71849A] italic mt-1 block">
                            Not found in uploaded evidence
                          </span>
                        )}
                      </div>
                      {intakeResult.fields?.beneficiary_upi_id?.source_screenshot && (
                        <span className="text-[10px] text-[#71849A] mt-2 block truncate">
                          Source: {intakeResult.fields.beneficiary_upi_id.source_screenshot}
                        </span>
                      )}
                    </div>

                    {/* Fraudster Phone Number */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider">
                            Fraudster Phone
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            intakeResult.fields?.fraudster_phone?.status === "Extracted" || intakeResult.fraudster_phone
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {intakeResult.fields?.fraudster_phone?.status || (intakeResult.fraudster_phone ? "Extracted" : "Needs Review")}
                          </span>
                        </div>
                        {intakeResult.fraudster_phone ? (
                          <span className="text-sm font-bold text-[#172F4D] mt-1 block font-mono">
                            {intakeResult.fraudster_phone}
                          </span>
                        ) : (
                          <span className="text-xs text-[#71849A] italic mt-1 block">
                            Not found in uploaded evidence
                          </span>
                        )}
                      </div>
                      {intakeResult.fields?.fraudster_phone?.source_screenshot && (
                        <span className="text-[10px] text-[#71849A] mt-2 block truncate">
                          Source: {intakeResult.fields.fraudster_phone.source_screenshot}
                        </span>
                      )}
                    </div>

                    {/* Scam Category */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                      <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider block mb-1.5">
                        Scam Category
                      </span>
                      <select
                        value={selectedCategory || intakeResult.scam_category}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DCE7F0] text-xs font-semibold text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                      >
                        <option value="PHISHING_PAYMENT_LINK">Phishing Payment Link</option>
                        <option value="FAKE_QR_SCAM">Fake QR Code Scam</option>
                        <option value="UPI_COLLECT_REQUEST_FRAUD">UPI Collect Request Fraud</option>
                        <option value="IMPERSONATION_SCAM">Bank / Official Impersonation</option>
                        <option value="REMOTE_ACCESS_APP_SCAM">Remote Access App Scam</option>
                        <option value="UNAUTHORIZED_UPI_DEBIT">Unauthorized UPI Debit</option>
                        <option value="NEEDS_CLASSIFICATION">Needs Classification</option>
                      </select>
                    </div>

                    {/* Transaction App / Mode */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                      <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider block">
                        Payment App / Channel
                      </span>
                      <span className="text-xs font-semibold text-[#172F4D] mt-1.5 block">
                        {intakeResult.app_used || "UPI App"}
                      </span>
                      {intakeResult.fields?.app_used?.source_screenshot && (
                        <span className="text-[10px] text-[#71849A] mt-1.5 block truncate">
                          Source: {intakeResult.fields.app_used.source_screenshot}
                        </span>
                      )}
                    </div>

                    {/* Transaction Timestamp */}
                    <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                      <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider block">
                        Transaction Date & Time
                      </span>
                      <span className="text-xs font-semibold text-[#172F4D] mt-1.5 block">
                        {intakeResult.transaction_date_time
                          ? formatDateTime(intakeResult.transaction_date_time)
                          : "Not found in evidence"}
                      </span>
                      {intakeResult.fields?.transaction_date_time?.source_screenshot && (
                        <span className="text-[10px] text-[#71849A] mt-1.5 block truncate">
                          Source: {intakeResult.fields.transaction_date_time.source_screenshot}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Incident Title & Description (Editable) */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider mb-1.5">
                        Incident Headline
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] font-medium focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider mb-1.5">
                        Detailed Incident Narrative
                      </label>
                      <textarea
                        rows={3}
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Developer / AI Extraction Diagnostics Accordion */}
              <div className="border border-[#DCE7F0] rounded-xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full px-4 py-3 bg-[#F1F6FB] hover:bg-[#E5F0F8] text-xs font-bold text-[#172F4D] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#172F4D]" />
                    <span>AI Extraction Diagnostics & Pipeline Inspection</span>
                    <Badge className="bg-white text-[#172F4D] border-[#DCE7F0] text-[10px]">Debug View</Badge>
                  </div>
                  {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showDiagnostics && (
                  <div className="p-4 sm:p-5 space-y-4 bg-white border-t border-[#DCE7F0] text-xs">
                    {/* Pipeline Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0]">
                        <span className="text-[10px] text-[#71849A] block uppercase font-semibold">OCR Engine</span>
                        <span className="text-xs font-mono font-bold text-[#172F4D]">
                          {intakeResult.debug_diagnostics?.engine_used || "windows_native_ocr"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0]">
                        <span className="text-[10px] text-[#71849A] block uppercase font-semibold">Claude Vision API</span>
                        <span className="text-xs font-mono font-bold text-[#172F4D]">
                          {intakeResult.debug_diagnostics?.claude_vision_active ? "Live API (Active)" : "Offline (Local OCR)"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0]">
                        <span className="text-[10px] text-[#71849A] block uppercase font-semibold">Extracted Parameters</span>
                        <span className="text-xs font-mono font-bold text-[#172F4D]">
                          {intakeResult.debug_diagnostics?.extracted_parameters_count ?? 0} Detected
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0]">
                        <span className="text-[10px] text-[#71849A] block uppercase font-semibold">Evidence Files</span>
                        <span className="text-xs font-mono font-bold text-[#172F4D]">
                          {intakeResult.uploaded_evidence.length} File(s)
                        </span>
                      </div>
                    </div>

                    {/* Raw Sanitized OCR Text Preview */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#172F4D] uppercase tracking-wider block">
                        Sanitized OCR Text Preview:
                      </span>
                      <div className="p-3 rounded-lg bg-[#0F172A] text-emerald-400 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {intakeResult.debug_diagnostics?.ocr_text_preview || "No text preview available."}
                      </div>
                    </div>

                    {/* Structured Extraction JSON Viewer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#172F4D] uppercase tracking-wider">
                          Structured JSON Response:
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(intakeResult, null, 2));
                            setCopiedDiagnostics(true);
                            setTimeout(() => setCopiedDiagnostics(false), 2000);
                          }}
                          className="text-[11px] h-7 border-[#DCE7F0] text-[#172F4D] flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedDiagnostics ? "Copied!" : "Copy JSON"}
                        </Button>
                      </div>
                      <pre className="p-3 rounded-lg bg-[#0F172A] text-sky-300 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed">
                        {JSON.stringify(intakeResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: MANUAL AMOUNT DEFRAUDED (THE ONLY FRAUD-SPECIFIC NUMERIC FIELD) */}
              <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#E1F1FB]/60 border-b border-[#DCE7F0] pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#172F4D] text-white flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg font-bold text-[#172F4D]">
                          Enter Amount Defrauded (INR)
                        </CardTitle>
                        <CardDescription className="text-xs text-[#71849A]">
                          The single required numeric field. Enter or verify the exact amount lost.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-[#172F4D] text-white text-[11px] font-semibold">
                      Manual Input
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider mb-2">
                      Amount Defrauded (INR) *
                    </label>
                    <div className="relative max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base font-bold text-[#172F4D]">
                        ₹
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={amountDefrauded}
                        onChange={(e) => setAmountDefrauded(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-lg font-bold text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                      />
                    </div>
                    {intakeResult.suggested_amount && (
                      <p className="text-[11px] text-[#71849A] mt-1.5">
                        Suggested from receipt OCR: <span className="font-semibold text-[#172F4D]">₹{intakeResult.suggested_amount}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* COMPLAINANT PROFILE VERIFICATION (AUTO-FILLED) */}
              <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#F1F6FB]/70 border-b border-[#DCE7F0] pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <CardTitle className="text-xs sm:text-sm font-bold text-[#172F4D]">
                        Complainant Identity (Auto-filled from Profile)
                      </CardTitle>
                    </div>
                    <span className="text-[11px] text-[#71849A]">No manual re-entry required</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#71849A] block">Full Name</span>
                    <span className="font-semibold text-[#172F4D]">{user?.full_name || "Citizen Complainant"}</span>
                  </div>
                  <div>
                    <span className="text-[#71849A] block">Registered Phone</span>
                    <span className="font-semibold text-[#172F4D]">{user?.phone_number || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-[#71849A] block">Email Address</span>
                    <span className="font-semibold text-[#172F4D]">{user?.email || "Not specified"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 4: CONFIRMATION & CASE CREATION BUTTON */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#71849A]">
                  Clicking below locks evidence into the immutable case vault and activates the emergency response checklist.
                </div>
                <Button
                  onClick={handleSubmitCase}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-[#172F4D] hover:bg-[#263F61] text-white font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering Case...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-amber-300" />
                      Create Fraud Case & Begin Emergency Defense
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Full-size Image Preview Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#DCE7F0]">
            <div className="p-4 border-b border-[#DCE7F0] flex items-center justify-between bg-[#F1F6FB]">
              <span className="text-xs sm:text-sm font-bold text-[#172F4D] truncate">
                {previewModalName}
              </span>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg hover:bg-white text-[#71849A] hover:text-[#172F4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-[#F1F6FB]/30">
              <img
                src={previewModalUrl}
                alt={previewModalName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-[#DCE7F0]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
