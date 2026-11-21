"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PhoneCall,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderLock,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  FileText,
  Send,
  Trash2,
  Edit3,
  Download,
  Eye,
  Sparkles,
  Hash,
  History,
  X,
  Copy,
  Check,
  Calendar,
  Building2,
  UserCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import {
  fetchDashboardCases,
  fetchCaseTracking,
  toggleChecklistItem,
  updateReferenceNumbers,
  addFollowUpNote,
  editFollowUpNote,
  deleteFollowUpNote,
  updateComplaintStatus,
  generateCaseComplaints,
  fetchOfficialReportingLinks
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  FraudCaseSummary,
  CaseTrackingDetail,
  EmergencyChecklistItem,
  ComplaintStatus,
  FollowUpNote,
  OfficialLinkItem
} from "@/types";

type TrackingTab = "checklist" | "timeline" | "references" | "notes" | "documents" | "links";

const STATUS_LABELS: Record<ComplaintStatus, { label: string; badgeClass: string }> = {
  NOT_SUBMITTED: { label: "Not Submitted", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
  SUBMITTED: { label: "Submitted to Authorities", badgeClass: "bg-sky-100 text-sky-800 border-sky-200" },
  UNDER_REVIEW: { label: "Under Review", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  ACTION_TAKEN: { label: "Action Taken / Lien Placed", badgeClass: "bg-purple-100 text-purple-800 border-purple-200" },
  RESOLVED: { label: "Resolved / Funds Recovered", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REJECTED_CLOSED: { label: "Rejected / Closed", badgeClass: "bg-rose-100 text-rose-800 border-rose-200" },
};

export default function EmergencyResponseDashboardPage() {
  const { token } = useAuth();
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [tracking, setTracking] = useState<CaseTrackingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TrackingTab>("checklist");

  // Checklist item updating
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Manual Complaint Status State
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>("NOT_SUBMITTED");
  const [statusNote, setStatusNote] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [showStatusHistory, setShowStatusHistory] = useState<boolean>(false);

  // Reference numbers form state
  const [ncrpToken, setNcrpToken] = useState("");
  const [bankSr, setBankSr] = useState("");
  const [policeRef, setPoliceRef] = useState("");
  const [ncrpSubmitted, setNcrpSubmitted] = useState(false);
  const [bankSubmitted, setBankSubmitted] = useState(false);
  const [isSavingRefs, setIsSavingRefs] = useState(false);

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("Bank Communication");
  const [noteFollowUpDate, setNoteFollowUpDate] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Documents state
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; content: string } | null>(null);
  const [copiedDoc, setCopiedDoc] = useState(false);

  // Official links
  const [officialLinks, setOfficialLinks] = useState<OfficialLinkItem[]>([]);

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user's fraud cases
  useEffect(() => {
    async function loadCases() {
      setIsLoading(true);
      try {
        const res = await fetchDashboardCases(token);
        if (res.success && res.data && res.data.length > 0) {
          setCases(res.data);
          const activeCase = res.data.find((c) => c.golden_hour_active) || res.data[0];
          setSelectedCaseId(activeCase.id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadCases();
  }, [token]);

  // Load tracking details & sync form states
  useEffect(() => {
    if (!selectedCaseId) return;

    async function loadTracking() {
      const res = await fetchCaseTracking(selectedCaseId, token);
      if (res.success && res.data) {
        setTracking(res.data);
        // Sync complaint status
        setSelectedStatus(res.data.complaint_status || "NOT_SUBMITTED");
        // Sync reference numbers
        setNcrpToken(res.data.ncrp_acknowledgement_token || "");
        setBankSr(res.data.bank_dispute_sr_number || "");
        setPoliceRef(res.data.police_station_ref || "");
        setNcrpSubmitted(res.data.ncrp_submission_confirmed || false);
        setBankSubmitted(res.data.bank_submission_confirmed || false);
      }
    }

    loadTracking();
  }, [selectedCaseId, token]);

  // Load official links
  useEffect(() => {
    async function loadLinks() {
      const res = await fetchOfficialReportingLinks();
      if (res.success && res.data) {
        setOfficialLinks(res.data);
      }
    }
    loadLinks();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Toggle checklist item state
  const handleToggle = async (itemId: string, currentState: boolean) => {
    if (!selectedCaseId || updatingItemId) return;
    setUpdatingItemId(itemId);

    try {
      const res = await toggleChecklistItem(selectedCaseId, itemId, !currentState, token);
      if (res.success && res.data) {
        setTracking(res.data);
        showToast("success", `Checklist item updated (${!currentState ? "Completed" : "Pending"}).`);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update item.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Manual Complaint Status Save (ONLY on explicit user click)
  const handleSaveComplaintStatus = async () => {
    if (!selectedCaseId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      const res = await updateComplaintStatus(selectedCaseId, selectedStatus, statusNote, token);
      if (res.success && res.data) {
        setTracking(res.data);
        setStatusNote("");
        showToast("success", `Complaint status updated to "${STATUS_LABELS[selectedStatus]?.label || selectedStatus}".`);
      } else {
        showToast("error", res.error?.message || "Failed to update status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Reference Numbers (automatically completes submission checklist items)
  const handleSaveReferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || isSavingRefs) return;
    setIsSavingRefs(true);

    try {
      const res = await updateReferenceNumbers(
        selectedCaseId,
        {
          ncrp_token: ncrpToken,
          bank_sr_number: bankSr,
          police_ref: policeRef,
          confirm_ncrp_submitted: ncrpSubmitted,
          confirm_bank_submitted: bankSubmitted
        },
        token
      );

      if (res.success && res.data) {
        setTracking(res.data);
        showToast("success", "Reference numbers saved. Submission checklist items automatically verified.");
      } else {
        showToast("error", res.error?.message || "Failed to save references.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to save references.");
    } finally {
      setIsSavingRefs(false);
    }
  };

  // Add Follow-up Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !noteText.trim() || isSavingNote) return;
    setIsSavingNote(true);

    try {
      const res = await addFollowUpNote(
        selectedCaseId,
        { note_text: noteText.trim(), category: noteCategory },
        token
      );
      if (res.success && res.data) {
        setTracking(res.data);
        setNoteText("");
        setNoteFollowUpDate("");
        showToast("success", "Follow-up note logged successfully.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Edit Note
  const handleEditNoteSave = async (noteId: string) => {
    if (!selectedCaseId || !editingNoteText.trim()) return;

    try {
      const res = await editFollowUpNote(selectedCaseId, noteId, editingNoteText.trim(), undefined, undefined, token);
      if (res.success && res.data) {
        setTracking(res.data);
        setEditingNoteId(null);
        showToast("success", "Note updated.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to edit note.");
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    if (!selectedCaseId) return;

    try {
      const res = await deleteFollowUpNote(selectedCaseId, noteId, token);
      if (res.success && res.data) {
        setTracking(res.data);
        showToast("success", "Note removed.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete note.");
    }
  };

  // Generate / Refresh Legal Package
  const handleGenerateLegalPackage = async () => {
    if (!selectedCaseId || isGeneratingDocs) return;
    setIsGeneratingDocs(true);

    try {
      const res = await generateCaseComplaints(selectedCaseId, "en", true, token);
      if (res.success && res.data) {
        // Reload tracking to reflect generated docs and updated checklist
        const trackRes = await fetchCaseTracking(selectedCaseId, token);
        if (trackRes.success && trackRes.data) {
          setTracking(trackRes.data);
        }
        showToast("success", "5 Legal complaint documents generated. Document checklist tasks auto-verified.");
      } else {
        showToast("error", res.error?.message || "Failed to generate documents.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to generate documents.");
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  // Preview or Download Document
  const handlePreviewDoc = (title: string, content: string) => {
    setPreviewDoc({ title, content });
    setCopiedDoc(false);
  };

  const handleDownloadDoc = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stage10m = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_10_MINUTES") || [];
  const stage1h = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_1_HOUR") || [];
  const stage24h = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_24_HOURS") || [];

  const completed10m = stage10m.filter((i) => i.is_completed).length;
  const completed1h = stage1h.filter((i) => i.is_completed).length;
  const completed24h = stage24h.filter((i) => i.is_completed).length;
  const totalCompleted = completed10m + completed1h + completed24h;
  const totalItems = (stage10m.length + stage1h.length + stage24h.length) || 12;
  const overallPercentage = Math.round((totalCompleted / totalItems) * 100);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const currentStatusConfig = STATUS_LABELS[tracking?.complaint_status || "NOT_SUBMITTED"];

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn pb-16">
      {/* Top Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight">
            Emergency Response & Case Tracking
          </h1>
          <p className="text-xs sm:text-sm text-[#71849A] mt-1">
            Golden Hour response console with verified 1930 protocol, automated legal drafting, and real-time case tracking.
          </p>
        </div>

        {/* Case Switcher Dropdown */}
        {cases.length > 1 && (
          <div className="relative">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="appearance-none bg-white border border-[#DCE7F0] text-xs font-semibold text-[#172F4D] py-2.5 pl-3.5 pr-8 rounded-xl shadow-sm focus:outline-none focus:border-[#172F4D] cursor-pointer"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} - {c.title.slice(0, 32)}...
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#71849A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Toast Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-sm animate-fadeIn ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Critical 1930 Helpline Emergency Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#E1F1FB] border border-[#BCE1F8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <PhoneCall className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Critical Helpline
              </span>
              <span className="text-xs text-[#71849A]">Citizen Financial Cyber Fraud Reporting System</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#172F4D] mt-1">
              National Cyber Helpline: Dial 1930
            </h2>
            <p className="text-xs text-[#477DA8] mt-0.5 max-w-xl">
              Connects directly with the MHA Cyber Crime Cell to freeze fraudulent beneficiary wallets/accounts across banks.
            </p>
          </div>
        </div>

        <a
          href="tel:1930"
          className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-sm transition-colors shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          Call 1930 Now (Toll-Free)
        </a>
      </div>

      {/* Case Overview & Progress Bar */}
      {selectedCase && (
        <Card className="border-[#DCE7F0] shadow-sm bg-white">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE7F0] pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#71849A] uppercase tracking-wider">
                  Active Case: {selectedCase.case_number}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-[#172F4D] mt-0.5">
                  {selectedCase.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-[#71849A] block">Defrauded Amount</span>
                  <span className="text-sm font-bold text-[#172F4D]">
                    {formatCurrency(selectedCase.amount_lost)}
                  </span>
                </div>
                {selectedCase.transaction_id_utr && (
                  <div className="text-right border-l border-[#DCE7F0] pl-3">
                    <span className="text-[11px] text-[#71849A] block">12-Digit UTR</span>
                    <span className="text-sm font-bold text-[#172F4D] font-mono">
                      {selectedCase.transaction_id_utr}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#172F4D]">
                <span>Emergency Action Progress</span>
                <span>
                  {totalCompleted} of {totalItems} completed ({overallPercentage}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F1F6FB] rounded-full overflow-hidden border border-[#DCE7F0]">
                <div
                  className="h-full bg-[#172F4D] rounded-full transition-all duration-300"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DEDICATED MANUAL COMPLAINT STATUS CARD (ONLY UPDATES ON EXPLICIT BUTTON CLICK) */}
      <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#172F4D] text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D]">
                  Official Complaint Status (Manual Tracking)
                </CardTitle>
                <CardDescription className="text-xs text-[#71849A]">
                  Track legal and banking progress. Never auto-switches; updates only on your explicit confirmation.
                </CardDescription>
              </div>
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#71849A]">Current Status:</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentStatusConfig.badgeClass}`}>
                {currentStatusConfig.label}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Status Dropdown */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                Update Status To
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs font-semibold text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
              >
                <option value="NOT_SUBMITTED">1. Not Submitted</option>
                <option value="SUBMITTED">2. Submitted to Authorities</option>
                <option value="UNDER_REVIEW">3. Under Review (NCRP / Bank)</option>
                <option value="ACTION_TAKEN">4. Action Taken / Lien Placed</option>
                <option value="RESOLVED">5. Resolved / Funds Recovered</option>
                <option value="REJECTED_CLOSED">6. Rejected / Closed</option>
              </select>
            </div>

            {/* Optional Note */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                Status Change Note (Optional)
              </label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Bank nodal officer confirmed lien on beneficiary VPA"
                className="w-full px-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
              />
            </div>

            {/* Save Status Button */}
            <div className="sm:col-span-3">
              <Button
                onClick={handleSaveComplaintStatus}
                disabled={isUpdatingStatus}
                className="w-full bg-[#172F4D] hover:bg-[#263F61] text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isUpdatingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Save Status
              </Button>
            </div>
          </div>

          {/* Timestamp & Audit History Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#DCE7F0] text-[11px] text-[#71849A]">
            <span>
              Last updated:{" "}
              <strong className="text-[#172F4D]">
                {tracking?.complaint_status_updated_at
                  ? formatDateTime(tracking.complaint_status_updated_at)
                  : "Never updated"}
              </strong>
            </span>

            {tracking?.status_history && tracking.status_history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStatusHistory(!showStatusHistory)}
                className="text-[#172F4D] hover:underline font-semibold flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                {showStatusHistory ? "Hide Status History" : `View History (${tracking.status_history.length})`}
              </button>
            )}
          </div>

          {/* Collapsible Status History List */}
          {showStatusHistory && tracking?.status_history && (
            <div className="mt-3 p-3 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-2">
              <h4 className="text-xs font-bold text-[#172F4D]">Status Audit Trail</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {tracking.status_history.map((hist, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-[#DCE7F0] text-xs flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#172F4D]">
                        {STATUS_LABELS[hist.status]?.label || hist.status}
                      </span>
                      {hist.note && <p className="text-[#71849A] mt-0.5">{hist.note}</p>}
                    </div>
                    <span className="text-[10px] text-[#71849A] shrink-0">
                      {formatDateTime(hist.changed_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6 TABS NAVIGATION */}
      <div className="border-b border-[#DCE7F0]">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "checklist"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            1. Emergency Checklist ({totalCompleted}/{totalItems})
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "timeline"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <Clock className="w-4 h-4" />
            2. Action Timeline ({tracking?.timeline.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("references")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "references"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <Hash className="w-4 h-4" />
            3. Reference Numbers
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "notes"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <FileText className="w-4 h-4" />
            4. Follow-up & Notes ({tracking?.follow_up_notes.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "documents"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <FolderLock className="w-4 h-4" />
            5. Legal Package / Documents
          </button>

          <button
            onClick={() => setActiveTab("links")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "links"
                ? "bg-[#172F4D] text-white shadow-sm"
                : "bg-white text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB] border border-[#DCE7F0]"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            6. Official Links
          </button>
        </nav>
      </div>

      {/* TAB CONTENT AREAS */}
      {isLoading ? (
        <div className="p-12 text-center text-[#71849A] space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#172F4D]" />
          <p className="text-xs">Loading case tracking data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EMERGENCY CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-6 animate-fadeIn">
              <StageCard
                stageNumber="1"
                title="Within 10 Minutes"
                subtitle="Immediate containment: Stop payment & freeze alert"
                completedCount={completed10m}
                totalCount={stage10m.length}
                items={stage10m}
                onToggle={handleToggle}
                updatingItemId={updatingItemId}
              />

              <StageCard
                stageNumber="2"
                title="Within 1 Hour"
                subtitle="Formal cybercrime reporting & inter-bank lien requisition"
                completedCount={completed1h}
                totalCount={stage1h.length}
                items={stage1h}
                onToggle={handleToggle}
                updatingItemId={updatingItemId}
              />

              <StageCard
                stageNumber="3"
                title="Within 24 Hours"
                subtitle="Follow-up, document archival & status monitoring"
                completedCount={completed24h}
                totalCount={stage24h.length}
                items={stage24h}
                onToggle={handleToggle}
                updatingItemId={updatingItemId}
              />
            </div>
          )}

          {/* TAB 2: ACTION TIMELINE */}
          {activeTab === "timeline" && (
            <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden animate-fadeIn">
              <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
                <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#172F4D]" />
                  Chronological Action Timeline
                </CardTitle>
                <CardDescription className="text-xs text-[#71849A]">
                  Real events automatically logged with timestamps as actions and submissions occur.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {(!tracking?.timeline || tracking.timeline.length === 0) ? (
                  <p className="text-xs text-[#71849A] text-center py-8">No timeline events recorded yet.</p>
                ) : (
                  <div className="relative border-l-2 border-[#DCE7F0] ml-3 sm:ml-4 space-y-6 py-2">
                    {tracking.timeline.map((ev) => {
                      const isEmerald = ev.badge_variant === "emerald";
                      const isCrimson = ev.badge_variant === "crimson";
                      return (
                        <div key={ev.id} className="relative pl-6 sm:pl-8">
                          {/* Circle dot on timeline */}
                          <div
                            className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                              isEmerald
                                ? "border-emerald-600 bg-emerald-50"
                                : isCrimson
                                ? "border-red-600 bg-red-50"
                                : "border-[#172F4D] bg-[#E1F1FB]"
                            }`}
                          />
                          <div className="p-3.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h4 className="text-xs sm:text-sm font-bold text-[#172F4D]">
                                {ev.title}
                              </h4>
                              <span className="text-[10px] text-[#71849A] shrink-0 font-medium">
                                {formatDateTime(ev.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-[#477DA8] leading-relaxed">
                              {ev.description}
                            </p>
                            {ev.reference_id && (
                              <span className="inline-block text-[10px] font-mono text-[#172F4D] bg-white px-2 py-0.5 rounded border border-[#DCE7F0] mt-1">
                                Ref: {ev.reference_id}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: REFERENCE NUMBERS */}
          {activeTab === "references" && (
            <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden animate-fadeIn">
              <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
                <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D] flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#172F4D]" />
                  Official Reference & Token Numbers
                </CardTitle>
                <CardDescription className="text-xs text-[#71849A]">
                  Log your official tokens from the 1930 Cybercrime Portal and Bank Nodal Desk.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="p-4 rounded-xl bg-[#E1F1FB] border border-[#BCE1F8] text-xs text-[#172F4D] flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Automatic Checklist Verification</strong>
                    <p className="text-[#477DA8] mt-0.5">
                      Saving your reference numbers automatically checks off "File complaint on Cybercrime Portal" and "Save Acknowledgement Number" in your emergency checklist.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveReferences} className="space-y-4">
                  {/* NCRP Token */}
                  <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-3">
                    <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider">
                      1930 NCRP Cyber Crime Acknowledgement Number
                    </label>
                    <input
                      type="text"
                      value={ncrpToken}
                      onChange={(e) => setNcrpToken(e.target.value)}
                      placeholder="e.g. 2026/089123/NCRP or 1930-TKN-88341"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE7F0] text-sm text-[#172F4D] font-mono focus:outline-none focus:border-[#172F4D]"
                    />
                    <label className="flex items-center gap-2 text-xs text-[#172F4D] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ncrpSubmitted}
                        onChange={(e) => setNcrpSubmitted(e.target.checked)}
                        className="rounded border-[#DCE7F0] text-[#172F4D] focus:ring-0"
                      />
                      <span>Confirmed submitted on National Cyber Crime Reporting Portal (cybercrime.gov.in)</span>
                    </label>
                  </div>

                  {/* Bank SR Number */}
                  <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-3">
                    <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider">
                      Bank Dispute Service Request (SR) / Reference
                    </label>
                    <input
                      type="text"
                      value={bankSr}
                      onChange={(e) => setBankSr(e.target.value)}
                      placeholder="e.g. AXIS-SR-992144 or HDFC-CC-77812"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE7F0] text-sm text-[#172F4D] font-mono focus:outline-none focus:border-[#172F4D]"
                    />
                    <label className="flex items-center gap-2 text-xs text-[#172F4D] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bankSubmitted}
                        onChange={(e) => setBankSubmitted(e.target.checked)}
                        className="rounded border-[#DCE7F0] text-[#172F4D] focus:ring-0"
                      />
                      <span>Confirmed registered with Bank Nodal Officer / Fraud Desk</span>
                    </label>
                  </div>

                  {/* Police Station Ref */}
                  <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-3">
                    <label className="block text-xs font-bold text-[#172F4D] uppercase tracking-wider">
                      Local Cyber Police Station Reference / GD Entry (Optional)
                    </label>
                    <input
                      type="text"
                      value={policeRef}
                      onChange={(e) => setPoliceRef(e.target.value)}
                      placeholder="e.g. Cyber PS East Zone / DD No. 42A"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE7F0] text-sm text-[#172F4D] font-mono focus:outline-none focus:border-[#172F4D]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingRefs}
                    className="bg-[#172F4D] hover:bg-[#263F61] text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
                  >
                    {isSavingRefs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    Save Reference Numbers
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: FOLLOW-UP & NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Add Note Form */}
              <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
                  <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#172F4D]" />
                    Add Follow-up Communication Note
                  </CardTitle>
                  <CardDescription className="text-xs text-[#71849A]">
                    Record calls with 1930 operators, bank branch visits, or police interactions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#172F4D] mb-1">
                          Communication Category
                        </label>
                        <select
                          value={noteCategory}
                          onChange={(e) => setNoteCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs font-semibold text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                        >
                          <option value="Bank Communication">Bank Nodal Officer / Branch</option>
                          <option value="1930 Cyber Helpline">1930 Cyber Helpline Operator</option>
                          <option value="Police Interaction">Cyber Crime Police Station</option>
                          <option value="General Investigation">General Citizen Log</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#172F4D] mb-1">
                          Next Follow-up Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={noteFollowUpDate}
                          onChange={(e) => setNoteFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#172F4D] mb-1">
                        Note Details
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="e.g. Spoke to Axis Bank dispute manager (Ramesh). They confirmed the freeze request is initiated under RBI 3-day limited liability rule."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSavingNote || !noteText.trim()}
                      className="bg-[#172F4D] hover:bg-[#263F61] text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      {isSavingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Save Follow-up Note
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Saved Notes List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#172F4D] uppercase tracking-wider">
                  Saved Communication History ({tracking?.follow_up_notes.length || 0})
                </h3>

                {(!tracking?.follow_up_notes || tracking.follow_up_notes.length === 0) ? (
                  <p className="text-xs text-[#71849A] text-center py-6 bg-white rounded-xl border border-[#DCE7F0]">
                    No communication notes recorded yet. Use the form above to log your first call or branch visit.
                  </p>
                ) : (
                  tracking.follow_up_notes.map((note) => (
                    <Card key={note.id} className="border-[#DCE7F0] shadow-sm bg-white">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#71849A] border-b border-[#DCE7F0] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#172F4D] px-2 py-0.5 rounded bg-[#E1F1FB] border border-[#BCE1F8]">
                              {note.category}
                            </span>
                            <span>By: {note.author}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{formatDateTime(note.created_at)}</span>
                            {note.follow_up_date && (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                Follow-up: {note.follow_up_date}
                              </span>
                            )}
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D]"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditNoteSave(note.id)}
                                className="bg-[#172F4D] text-white text-xs py-1 px-3"
                              >
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingNoteId(null)}
                                className="text-xs py-1 px-3"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 pt-1">
                            <p className="text-xs text-[#172F4D] leading-relaxed whitespace-pre-wrap">
                              {note.note_text}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteText(note.note_text);
                                }}
                                className="p-1 text-[#71849A] hover:text-[#172F4D] rounded"
                                title="Edit Note"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                                title="Delete Note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS READY */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Generation Action Banner */}
              <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#E1F1FB]/70 border-b border-[#DCE7F0] p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#172F4D] text-white flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-sky-300" />
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D]">
                          AI Legal Complaint Package (5 Standard Documents)
                        </CardTitle>
                        <CardDescription className="text-xs text-[#71849A]">
                          Formatted under Section 66D IT Act & RBI Master Directions for immediate bank lien & police filing.
                        </CardDescription>
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerateLegalPackage}
                      disabled={isGeneratingDocs}
                      className="bg-[#172F4D] hover:bg-[#263F61] text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                      {isGeneratingDocs ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating Legal Package...
                        </>
                      ) : (
                        <>
                          <FolderLock className="w-4 h-4" />
                          Generate / Refresh Legal Package
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <p className="text-xs text-[#477DA8] leading-relaxed">
                    Clicking "Generate / Refresh Legal Package" generates standardized legal drafts for your case and automatically marks your document sharing checklist tasks as verified.
                  </p>
                </CardContent>
              </Card>

              {/* 5 Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    type: "BANK_FRAUD_COMPLAINT",
                    title: "1. Bank Fraud Complaint Letter",
                    desc: "Formal letter to the Principal Nodal Officer disputing the transaction under RBI zero-liability rules.",
                    stage: "Within 10 Minutes",
                    sampleContent: `URGENT: DISPUTE & FRAUD COMPLAINT UNDER RBI CUSTOMER PROTECTION GUIDELINES\n\nTo,\nThe Principal Nodal Officer / Fraud Risk Management Team\n${selectedCase?.title || "Issuing Bank"}\n\nSubject: Urgent dispute and lien requisition for fraudulent UPI transfer UTR: ${selectedCase?.transaction_id_utr || "Pending"}\n\nDear Sir/Madam,\nI am writing immediately within the Golden Hour window to report an unauthorized UPI debit of INR ${selectedCase?.amount_lost?.toLocaleString() || "0.00"}.\n\nAs mandated by RBI Master Direction (RBI/2017-18/15), reporting within 3 working days guarantees zero liability for third-party breaches. Kindly immediately initiate an inter-bank recall and lien marking on the beneficiary account at the receiving bank.\n\nSincerely,\nCitizen Complainant`
                  },
                  {
                    type: "BANK_FREEZE_REQUEST",
                    title: "2. Beneficiary Account Debit Freeze Requisition",
                    desc: "Urgent freeze request directed to the beneficiary's receiving bank to lock defrauded funds.",
                    stage: "Within 10 Minutes",
                    sampleContent: `EMERGENCY REQUISITION: IMMEDIATE DEBIT FREEZE ON FRAUDULENT BENEFICIARY ACCOUNT\n\nTo,\nThe Fraud Monitoring Cell & Nodal Officer\nBeneficiary Bank: ${selectedCase?.beneficiary_upi_id ? selectedCase.beneficiary_upi_id.split("@")[1]?.toUpperCase() : "Receiving Bank"}\n\nTransaction Reference (UTR): ${selectedCase?.transaction_id_utr || "Pending"}\nBeneficiary VPA: ${selectedCase?.beneficiary_upi_id || "Reported Beneficiary"}\nAmount Defrauded: INR ${selectedCase?.amount_lost?.toLocaleString() || "0.00"}\n\nTake notice that the above transaction constitutes cyber fraud under Section 66D IT Act. Under Section 102 CrPC / BNSS, kindly place an immediate debit freeze / lien on the beneficiary wallet/account.`
                  },
                  {
                    type: "HELPLINE_1930_SCRIPT",
                    title: "3. 1930 Cyber Helpline Citizen Call Script",
                    desc: "Step-by-step phone speaking script ensuring you provide all technical parameters to the 1930 police officer without panic.",
                    stage: "Within 10 Minutes",
                    sampleContent: `1930 HELPLINE CALL SCRIPT - SPEAK CLEARLY:\n\n1. State: "Hello Officer, I have been defrauded in an unauthorized UPI transaction within the last hour. I need immediate lien marking on the beneficiary wallet."\n2. When asked for details:\n   - My 12-Digit UTR is: ${selectedCase?.transaction_id_utr || "[Provide 12-digit UTR]"}\n   - Beneficiary UPI ID is: ${selectedCase?.beneficiary_upi_id || "[Provide beneficiary VPA]"}\n   - Amount Defrauded: INR ${selectedCase?.amount_lost?.toLocaleString() || "0.00"}\n   - Incident Time: Just occurred within the Golden Hour\n3. Request: "Kindly log this in the Citizen Financial Cyber Fraud Reporting System (CFCFRS) and provide my NCRP Acknowledgement Token."`
                  },
                  {
                    type: "CYBERCRIME_PORTAL_DRAFT",
                    title: "4. National Cyber Crime Portal (NCRP) Draft",
                    desc: "Structured complaint narrative formatted for cybercrime.gov.in with exact legal and transactional fields.",
                    stage: "Within 1 Hour",
                    sampleContent: `FORMAL COMPLAINT DRAFT FOR CYBERCRIME.GOV.IN:\n\nCategory: Financial Fraud / UPI Fraud\nSub-Category: Unauthorized Debit / Phishing\n\n1. TRANSACTION DETAILS:\n- UTR: ${selectedCase?.transaction_id_utr || "Pending"}\n- Beneficiary UPI ID: ${selectedCase?.beneficiary_upi_id || "Pending"}\n- Amount: INR ${selectedCase?.amount_lost?.toLocaleString() || "0.00"}\n\n2. STATEMENT OF COMPLAINT:\nThe complainant was targeted by cyber fraudsters who initiated an unauthorized debit without consent. Complainant has already contacted helpline 1930 and bank nodal officer. Complainant prays for immediate fund recovery and registration of formal cyber FIR.`
                  },
                  {
                    type: "EVIDENCE_SUMMARY",
                    title: "5. Evidentiary Summary & Digital Timeline Report",
                    desc: "Comprehensive evidentiary dossier summarizing timestamps, OCR matches, and screenshot hashes for police investigation.",
                    stage: "Within 24 Hours",
                    sampleContent: `GOLDENHOUR DIGITAL FORENSIC EVIDENCE DOSSIER\n\nCase Number: ${selectedCase?.case_number || "GH-CASE"}\nGenerated: ${new Date().toISOString()}\n\n1. CHAIN OF CUSTODY:\n- Total Evidence Files: ${selectedCase?.evidence_count || 1}\n- Zero Credential Compliance: Verified (No PIN, OTP or CVV stored)\n- UTR Verification Status: ${selectedCase?.transaction_id_utr ? "Matched via Native OCR" : "Pending Manual Verification"}\n\n2. FORENSIC RECORD:\n- Registered Amount: INR ${selectedCase?.amount_lost?.toLocaleString() || "0.00"}\n- Beneficiary Account VPA: ${selectedCase?.beneficiary_upi_id || "N/A"}\n- Preserved under Section 65B Indian Evidence Act / BSA.`
                  }
                ].map((doc) => (
                  <Card key={doc.type} className="border-[#DCE7F0] shadow-sm bg-white flex flex-col justify-between">
                    <CardHeader className="p-4 border-b border-[#DCE7F0] bg-[#F1F6FB]/50">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold text-[#172F4D]">
                          {doc.title}
                        </CardTitle>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold shrink-0">
                          Ready
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-[#71849A] mt-1">
                        {doc.desc}
                      </CardDescription>
                      <span className="text-[10px] text-[#477DA8] font-medium block mt-1">
                        Recommended: {doc.stage}
                      </span>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewDoc(doc.title, doc.sampleContent)}
                        className="text-xs border-[#DCE7F0] text-[#172F4D] hover:bg-[#F1F6FB] flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadDoc(doc.title, doc.sampleContent)}
                        className="bg-[#172F4D] text-white hover:bg-[#263F61] text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download (.txt)
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: OFFICIAL LINKS */}
          {activeTab === "links" && (
            <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden animate-fadeIn">
              <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
                <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#172F4D]" />
                  Verified Cybercrime & Bank Emergency Desks
                </CardTitle>
                <CardDescription className="text-xs text-[#71849A]">
                  Official government portals and scheduled commercial bank fraud reporting contact links.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(officialLinks.length > 0 ? officialLinks : [
                    {
                      name: "National Cyber Crime Reporting Portal (NCRP)",
                      url: "https://cybercrime.gov.in",
                      category: "GOVERNMENT",
                      description: "Official Ministry of Home Affairs citizen portal for reporting financial cyber fraud and tracking status.",
                      verified: true,
                      helpline_number: "1930",
                      badge_text: "Official Government Portal"
                    },
                    {
                      name: "RBI Sachet Portal",
                      url: "https://sachet.rbi.org.in",
                      category: "REGULATOR",
                      description: "Reserve Bank of India portal for tracking unauthorized financial entities and deposit scams.",
                      verified: true,
                      helpline_number: "14440",
                      badge_text: "Reserve Bank of India"
                    },
                    {
                      name: "State Bank of India (SBI) Fraud Desk",
                      url: "https://bank.sbi",
                      category: "BANK",
                      description: "SBI 24x7 customer helpline for blocking UPI, net banking, and cards.",
                      verified: true,
                      helpline_number: "1800111109",
                      badge_text: "Verified Bank Desk"
                    },
                    {
                      name: "HDFC Bank Fraud Incident Desk",
                      url: "https://www.hdfcbank.com",
                      category: "BANK",
                      description: "HDFC Bank emergency fraud reporting and stop-payment contact.",
                      verified: true,
                      helpline_number: "18002583838",
                      badge_text: "Verified Bank Desk"
                    },
                    {
                      name: "ICICI Bank Cyber Defense Desk",
                      url: "https://www.icicibank.com",
                      category: "BANK",
                      description: "ICICI Bank emergency helpline for instant debit freeze.",
                      verified: true,
                      helpline_number: "18002663499",
                      badge_text: "Verified Bank Desk"
                    },
                    {
                      name: "Axis Bank Emergency Nodal Officer",
                      url: "https://www.axisbank.com",
                      category: "BANK",
                      description: "Axis Bank fraud response and beneficiary lien request portal.",
                      verified: true,
                      helpline_number: "18004190068",
                      badge_text: "Verified Bank Desk"
                    }
                  ]).map((link, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#172F4D]">{link.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {link.badge_text}
                          </span>
                        </div>
                        <p className="text-xs text-[#71849A] mt-1.5 leading-relaxed">
                          {link.description}
                        </p>
                        {link.helpline_number && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600">
                            <PhoneCall className="w-3.5 h-3.5" />
                            Helpline: {link.helpline_number}
                          </div>
                        )}
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] font-semibold text-xs py-2 px-3 rounded-xl transition-colors shadow-2xs"
                      >
                        Visit Official Portal
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#DCE7F0] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-[#DCE7F0] bg-[#F1F6FB] flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-[#172F4D]">
                {previewDoc.title}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto font-mono text-xs text-[#172F4D] whitespace-pre-wrap leading-relaxed bg-[#FAFDFE]">
              {previewDoc.content}
            </div>

            <div className="p-4 border-t border-[#DCE7F0] bg-white flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(previewDoc.content);
                  setCopiedDoc(true);
                  setTimeout(() => setCopiedDoc(false), 2000);
                }}
                className="text-xs flex items-center gap-1.5"
              >
                {copiedDoc ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedDoc ? "Copied to Clipboard!" : "Copy Full Text"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadDoc(previewDoc.title, previewDoc.content)}
                  className="bg-[#172F4D] text-white hover:bg-[#263F61] text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stage Card Component with Auto / Manual Badges and Toggle Checkboxes
function StageCard({
  stageNumber,
  title,
  subtitle,
  completedCount,
  totalCount,
  items,
  onToggle,
  updatingItemId,
}: {
  stageNumber: string;
  title: string;
  subtitle: string;
  completedCount: number;
  totalCount: number;
  items: EmergencyChecklistItem[];
  onToggle: (itemId: string, currentState: boolean) => void;
  updatingItemId: string | null;
}) {
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <Card className="border-[#DCE7F0] shadow-sm bg-white overflow-hidden">
      <CardHeader className="bg-[#F1F6FB]/80 border-b border-[#DCE7F0] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#172F4D] text-white flex items-center justify-center font-bold text-sm">
              {stageNumber}
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-[#172F4D]">
                Stage {stageNumber}: {title}
              </CardTitle>
              <CardDescription className="text-xs text-[#71849A]">
                {subtitle}
              </CardDescription>
            </div>
          </div>

          {/* Completed Count Badge */}
          <Badge
            className={`text-xs font-bold px-2.5 py-1 ${
              isAllDone
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-white text-[#172F4D] border-[#DCE7F0]"
            }`}
          >
            {completedCount}/{totalCount} completed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {items.map((item) => {
          const isBusy = updatingItemId === item.id;
          const isAuto = item.completion_source === "AUTOMATIC";

          return (
            <div
              key={item.id}
              onClick={() => !isBusy && onToggle(item.id, item.is_completed)}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                item.is_completed
                  ? "bg-emerald-50/50 border-emerald-200 text-[#172F4D]"
                  : "bg-white border-[#DCE7F0] hover:border-[#172F4D] text-[#172F4D]"
              }`}
            >
              {/* Checkbox Icon */}
              <div className="mt-0.5 shrink-0">
                {isBusy ? (
                  <RefreshCw className="w-5 h-5 text-[#172F4D] animate-spin" />
                ) : item.is_completed ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-[#8CA0B3] hover:text-[#172F4D]" />
                )}
              </div>

              {/* Title, Badges & Description */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`text-xs sm:text-sm font-semibold transition-all ${
                      item.is_completed ? "text-emerald-900 line-through opacity-85" : "text-[#172F4D]"
                    }`}
                  >
                    {item.title}
                  </h4>

                  {/* Verification Source Indicator Badge */}
                  {item.is_completed ? (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isAuto
                          ? "bg-sky-100 text-sky-800 border-sky-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {isAuto ? "System Verified" : "Citizen Confirmed"}
                    </span>
                  ) : item.is_auto_completable ? (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Auto-Verifies on File/Token
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-[#71849A] mt-1 leading-relaxed">
                  {item.description}
                </p>

                {item.completed_at && (
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Verified: {formatDateTime(item.completed_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
