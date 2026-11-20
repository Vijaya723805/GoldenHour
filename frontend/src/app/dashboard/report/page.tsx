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
  FolderLock, 
  ArrowRight,
  Sparkles,
  Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { createFraudCase, uploadCaseEvidence, deleteCaseEvidence } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { EvidenceCategory, EvidenceItem, FraudCaseDetail, Language } from "@/types";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  category: EvidenceCategory;
  description: string;
  uploadProgress: number; // 0 to 100
  uploadedItem?: EvidenceItem;
  status: "PENDING" | "UPLOADING" | "SUCCESS" | "ERROR";
  errorMsg?: string;
}

const CATEGORY_LABELS: Record<EvidenceCategory, { label: string; desc: string }> = {
  UPI_RECEIPT: {
    label: "UPI Transaction Receipt",
    desc: "PhonePe, Google Pay, Paytm, BHIM screenshot showing debit",
  },
  BANK_STATEMENT: {
    label: "Bank Transaction Screenshot",
    desc: "Mobile banking app or passbook transaction statement",
  },
  SMS_ALERT: {
    label: "Bank / Phishing SMS Screenshot",
    desc: "SMS alert received regarding debit or phishing link",
  },
  WHATSAPP_CHAT: {
    label: "WhatsApp / Chat Conversation",
    desc: "Scammer chat log, Telegram group, or payment request link",
  },
  OTHER: {
    label: "Other Relevant Evidence",
    desc: "Call recordings, emails, APK download prompts, or web URLs",
  },
};

export default function ReportFraudPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { language, t } = useLanguage();

  // Form State: Case Details
  const [title, setTitle] = useState("");
  const [fraudCategory, setFraudCategory] = useState("PHISHING_PAYMENT_LINK");
  const [fraudDescription, setFraudDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [amountLost, setAmountLost] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState("");
  const [beneficiaryUpi, setBeneficiaryUpi] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("Unknown");
  const [preferredLang, setPreferredLang] = useState<Language>(language);
  const [contactPhone, setContactPhone] = useState(user?.phone_number || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");

  // Evidence Files Queue
  const [filesQueue, setFilesQueue] = useState<PendingFile[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<EvidenceCategory>("UPI_RECEIPT");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Case Creation State
  const [createdCase, setCreatedCase] = useState<FraudCaseDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Full-size Preview Modal
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalName, setPreviewModalName] = useState<string>("");

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB

    const newEntries: PendingFile[] = [];

    Array.from(fileList).forEach((file) => {
      // Validate type
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setStatusMsg({
          type: "error",
          text: `File "${file.name}" is not supported. Allowed: PNG, JPG, JPEG, WEBP, PDF.`,
        });
        return;
      }

      // Validate size
      if (file.size > maxSizeBytes) {
        setStatusMsg({
          type: "error",
          text: `File "${file.name}" exceeds the 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        });
        return;
      }

      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      newEntries.push({
        id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        category: defaultCategory,
        description: "",
        uploadProgress: 0,
        status: "PENDING",
      });
    });

    if (newEntries.length > 0) {
      setFilesQueue((prev) => [...prev, ...newEntries]);
      setStatusMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleRemoveFile = async (item: PendingFile) => {
    // If already uploaded to server in an active case, delete from backend
    if (createdCase && item.uploadedItem) {
      try {
        await deleteCaseEvidence(createdCase.id, item.uploadedItem.id, token);
      } catch (err) {
        console.error("Failed to delete file from server:", err);
      }
    }

    // Revoke object URL
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

    setFilesQueue((prev) => prev.filter((f) => f.id !== item.id));
  };

  const handleCategoryChange = (id: string, newCat: EvidenceCategory) => {
    setFilesQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, category: newCat } : f))
    );
  };

  const handleDescriptionChange = (id: string, desc: string) => {
    setFilesQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, description: desc } : f))
    );
  };

  // Submit Full Case and Upload All Evidence Files
  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (fraudDescription.trim().length < 10) {
      setStatusMsg({
        type: "error",
        text: "Please provide a more detailed fraud description (minimum 10 characters).",
      });
      return;
    }

    if (filesQueue.length === 0) {
      setStatusMsg({
        type: "error",
        text: "Please upload at least one piece of digital evidence (receipt, screenshot, or SMS).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create Case Record in Backend
      const caseRes = await createFraudCase(
        {
          title: title || `${fraudCategory.replace(/_/g, " ")} Incident`,
          fraud_category: fraudCategory,
          fraud_description: fraudDescription,
          incident_date: incidentDate,
          amount_lost: parseFloat(amountLost) || 0.0,
          transaction_id_utr: utrNumber.trim() || undefined,
          beneficiary_upi_id: beneficiaryUpi.trim() || undefined,
          beneficiary_bank: beneficiaryBank.trim() || undefined,
          preferred_language: preferredLang,
          contact_phone: contactPhone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
        },
        token
      );

      if (!caseRes.success || !caseRes.data) {
        throw new Error(caseRes.error?.message || "Failed to initialize fraud incident case.");
      }

      const newCase = caseRes.data;
      setCreatedCase(newCase);

      // 2. Upload Each Evidence File Associated with this Case
      const updatedQueue: PendingFile[] = [...filesQueue];

      for (let i = 0; i < updatedQueue.length; i++) {
        const item = updatedQueue[i];
        item.status = "UPLOADING";
        item.uploadProgress = 30;
        setFilesQueue([...updatedQueue]);

        try {
          item.uploadProgress = 70;
          setFilesQueue([...updatedQueue]);

          const uploadRes = await uploadCaseEvidence(
            newCase.id,
            item.file,
            item.category,
            item.description,
            token
          );

          if (uploadRes.success && uploadRes.data) {
            item.status = "SUCCESS";
            item.uploadProgress = 100;
            item.uploadedItem = uploadRes.data;
          } else {
            item.status = "ERROR";
            item.errorMsg = uploadRes.error?.message || "Upload failed";
          }
        } catch (err: any) {
          item.status = "ERROR";
          item.errorMsg = err.message || "Upload error";
        }

        setFilesQueue([...updatedQueue]);
      }

      setStatusMsg({
        type: "success",
        text: `Fraud case "${newCase.case_number}" registered successfully with ${filesQueue.length} evidence file(s) safely stored!`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "An error occurred while creating case.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreloadDemo = () => {
    setTitle("Fake Electricity Bill Power Disconnection SMS Scam");
    setFraudCategory("PHISHING_PAYMENT_LINK");
    setFraudDescription("Received an SMS stating power would be disconnected tonight. Guided to pay Rs. 24,500 on PhonePe to an unknown VPA.");
    setAmountLost("24500");
    setUtrNumber("412890563412");
    setBeneficiaryUpi("rewards.claim77@ybl");
    setBeneficiaryBank("YES BANK");
    setContactPhone("+919876543210");
  };

  return (
    <div className="space-y-8 max-w-5xl animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Report a Fraud Incident
            </h1>
            <Badge variant="crimson">Module 2: Evidence Vault</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Secure digital evidence intake. Upload receipts, SMS, and WhatsApp chats to freeze fraudulent recipient accounts.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePreloadDemo}
          className="text-xs gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          Preload Sample Incident
        </Button>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "success" : "danger"}>
          {statusMsg.text}
        </Alert>
      )}

      {/* Case Creation & Ingestion Form */}
      <form onSubmit={handleSubmitCase} className="space-y-8">
        {/* Section 1: Incident Particulars & Victim Inputs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>1. Incident Particulars & Victim Details</CardTitle>
              <Badge variant="outline">Case Information</Badge>
            </div>
            <CardDescription>
              Provide basic information about the fraud incident. These details will be associated with all uploaded evidence.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Incident Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unauthorized GPay transfer after scanning OLX QR code"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Scam Category *
                </label>
                <select
                  value={fraudCategory}
                  onChange={(e) => setFraudCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple"
                >
                  <option value="PHISHING_PAYMENT_LINK">Phishing Payment Link</option>
                  <option value="FAKE_QR_SCAM">Fake QR Code Scam</option>
                  <option value="BANK_OR_OFFICIAL_IMPERSONATION">Bank / Police Impersonation</option>
                  <option value="LOTTERY_REWARD_SCAM">Lottery / Cashback Reward</option>
                  <option value="REMOTE_ACCESS_APP">Remote Access App (AnyDesk/TeamViewer)</option>
                  <option value="MARKETPLACE_ADVANCE_FEE">OLX / Marketplace Advance Fee</option>
                  <option value="UNAUTHORIZED_DEBIT">Unauthorized Debit / SIM Swap</option>
                  <option value="OTHER">Other UPI Cyber Fraud</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Detailed Fraud Incident Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe how you were contacted, what instructions the fraudster gave, what apps were opened, and how the unauthorized debit occurred..."
                value={fraudDescription}
                onChange={(e) => setFraudDescription(e.target.value)}
                className="w-full p-3 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum 10 characters. Include any specific names, phone numbers, or threats used by the scammer.
              </p>
            </div>

            {/* Incident Date, Amount, UTR, Beneficiary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Approximate Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white focus:outline-none focus:border-purple font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Amount Defrauded (INR)
                </label>
                <input
                  type="number"
                  placeholder="24500"
                  value={amountLost}
                  onChange={(e) => setAmountLost(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-crimson-light font-mono font-bold focus:outline-none focus:border-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  12-Digit UTR / Ref Number
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="e.g. 412890563412"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-gold font-mono font-bold focus:outline-none focus:border-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Beneficiary (Fraudster VPA)
                </label>
                <input
                  type="text"
                  placeholder="fraudster@ybl"
                  value={beneficiaryUpi}
                  onChange={(e) => setBeneficiaryUpi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:outline-none focus:border-purple"
                />
              </div>
            </div>

            {/* Language & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-navy-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Language
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value as Language)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white focus:outline-none focus:border-purple"
                >
                  <option value="en">English</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Complainant Contact Mobile
                </label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:outline-none focus:border-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Complainant Email
                </label>
                <input
                  type="email"
                  placeholder="victim@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white focus:outline-none focus:border-purple"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Drag-and-Drop Digital Evidence Ingestion */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>2. Digital Evidence Vault Ingestion</CardTitle>
                <CardDescription>
                  Upload digital proofs: UPI receipts, SMS notifications, and WhatsApp chats. Multiple files supported.
                </CardDescription>
              </div>
              <Badge variant="gold">Private Encrypted Storage</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Category selection for upcoming files */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-navy-950 border border-navy-800">
              <span className="text-xs font-semibold text-slate-300">
                Default Evidence Category for Next Upload:
              </span>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value as EvidenceCategory)}
                className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-gold font-semibold focus:outline-none focus:border-purple"
              >
                <option value="UPI_RECEIPT">UPI Transaction Receipt</option>
                <option value="BANK_STATEMENT">Bank Statement / Debit Screenshot</option>
                <option value="SMS_ALERT">SMS Notification / Bank Alert</option>
                <option value="WHATSAPP_CHAT">WhatsApp / Social Media Chat</option>
                <option value="OTHER">Other Digital Evidence</option>
              </select>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-purple bg-purple/15 scale-[1.01]"
                  : "border-navy-700 bg-navy-950/60 hover:border-purple/50 hover:bg-navy-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 bg-purple/15 text-purple-light rounded-2xl border border-purple/30 shadow-glow">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Click to browse or drag & drop evidence screenshots here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PNG, JPG, JPEG, WEBP or PDF (Max 15MB each). Multiple files permitted.
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence Files Queue / Thumbnails */}
            {filesQueue.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Uploaded Evidence Queue ({filesQueue.length} files)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total: {(filesQueue.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filesQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3 relative group"
                    >
                      {/* Thumbnail or File Icon */}
                      <div className="w-16 h-16 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              setPreviewModalUrl(item.previewUrl);
                              setPreviewModalName(item.file.name);
                            }}
                          />
                        ) : (
                          <FileText className="w-7 h-7 text-purple" />
                        )}

                        {item.previewUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewModalUrl(item.previewUrl);
                              setPreviewModalName(item.file.name);
                            }}
                            className="absolute inset-0 bg-navy-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Eye className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Details & Controls */}
                      <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white truncate max-w-[180px]">
                            {item.file.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item)}
                            className="text-slate-500 hover:text-crimson p-1 rounded transition-colors"
                            title="Remove evidence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-400 font-mono">
                          {(item.file.size / 1024).toFixed(1)} KB • {item.file.type.split("/")[1]?.toUpperCase() || "BIN"}
                        </p>

                        {/* Category Selector for this file */}
                        <div>
                          <select
                            value={item.category}
                            onChange={(e) => handleCategoryChange(item.id, e.target.value as EvidenceCategory)}
                            className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1 text-[11px] text-gold focus:outline-none"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([catKey, catVal]) => (
                              <option key={catKey} value={catKey}>
                                {catVal.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Upload Status / Progress */}
                        {item.status === "UPLOADING" && (
                          <div className="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple h-full transition-all duration-300"
                              style={{ width: `${item.uploadProgress}%` }}
                            />
                          </div>
                        )}

                        {item.status === "SUCCESS" && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Encrypted & Associated with Case
                          </span>
                        )}

                        {item.status === "ERROR" && (
                          <span className="text-[10px] text-crimson flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3" /> {item.errorMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zero-Public Access & Security Notice */}
            <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 text-xs text-slate-300 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Private Evidence Vault: Stored in isolated tenant directory. No public web URLs are ever exposed.
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">15MB Max / File</Badge>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Confirm incident details and ensure no sensitive passwords are included.
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              isLoading={isSubmitting}
              className="w-full sm:w-auto font-bold gap-2 text-navy-950 shadow-gold-glow"
            >
              <span>Submit Case & Seal Evidence Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Case Summary Receipt (Rendered after successful creation) */}
      {createdCase && (
        <Card className="border-emerald-500/40 shadow-glow animate-fadeIn">
          <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <CardTitle className="text-emerald-300">
                    Evidence Collection Registered: {createdCase.case_number}
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    All digital evidence items have been associated with this incident record and stored in the private vault.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="success">EVIDENCE SECURED</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-navy-950 border border-navy-800">
              <div>
                <span className="text-slate-400">Defrauded Amount:</span>
                <p className="font-mono font-bold text-crimson text-base mt-0.5">
                  {formatCurrency(createdCase.amount_lost)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">12-Digit Bank UTR:</span>
                <p className="font-mono font-bold text-gold text-sm mt-0.5">
                  {createdCase.transaction_id_utr || "Pending"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Evidence Files Stored:</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {filesQueue.length} files attached
                </p>
              </div>
              <div>
                <span className="text-slate-400">Reporting Status:</span>
                <p className="font-semibold text-purple-light mt-0.5">
                  {createdCase.status}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/dashboard/cases">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <FolderLock className="w-4 h-4" />
                  View in My Cases
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Return to Dashboard
                </Button>
              </Link>
              <a href="tel:1930">
                <Button variant="danger" size="sm" className="font-bold">
                  Call 1930 with Ref {createdCase.case_number}
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-navy-900 border border-navy-700 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-navy-800">
              <span className="text-xs font-semibold text-slate-200 truncate">
                Evidence Preview: {previewModalName}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-navy-950 rounded-xl p-2">
              <img
                src={previewModalUrl}
                alt="Evidence Preview"
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
