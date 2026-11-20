"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  FileText,
  Download,
  Plus,
  RefreshCw,
  Calendar,
  Building,
  User,
  Hash,
  ArrowLeft,
  ShieldCheck,
  Send,
  MessageSquare,
  AlertOctagon,
  Bot,
  FileCheck,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import {
  fetchCaseTracking,
  fetchEmergencyDashboard,
  updateReferenceNumbers,
  updateCaseTrackingStatus,
  addFollowUpNote,
  toggleChecklistItem,
  getComplaintPdfDownloadUrl
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  CaseTrackingDetail,
  EmergencyDashboardData,
  TrackingStatus,
  ActionStage
} from "@/types";

export default function CaseTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.caseId as string;
  const { token } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"checklist" | "timeline" | "references" | "notes" | "documents" | "links">("checklist");
  const [tracking, setTracking] = useState<CaseTrackingDetail | null>(null);
  const [dashboardData, setDashboardData] = useState<EmergencyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for Reference Numbers
  const [ncrpTokenInput, setNcrpTokenInput] = useState("");
  const [bankSrInput, setBankSrInput] = useState("");
  const [policeRefInput, setPoliceRefInput] = useState("");
  const [confirmNcrp, setConfirmNcrp] = useState(false);
  const [confirmBank, setConfirmBank] = useState(false);
  const [isSavingRefs, setIsSavingRefs] = useState(false);

  // Form states for Status Update
  const [selectedStatus, setSelectedStatus] = useState<TrackingStatus>("CASE_INITIALIZED");
  const [statusNoteInput, setStatusNoteInput] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Form states for Note
  const [newNoteText, setNewNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("Bank Call");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const loadCaseData = async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const [trackRes, dashRes] = await Promise.all([
        fetchCaseTracking(caseId, token),
        fetchEmergencyDashboard(caseId, token),
      ]);

      if (trackRes.success && trackRes.data) {
        setTracking(trackRes.data);
        setSelectedStatus(trackRes.data.current_status);
        setNcrpTokenInput(trackRes.data.ncrp_acknowledgement_token || "");
        setBankSrInput(trackRes.data.bank_dispute_sr_number || "");
        setPoliceRefInput(trackRes.data.police_station_ref || "");
        setConfirmNcrp(trackRes.data.ncrp_submission_confirmed || false);
        setConfirmBank(trackRes.data.bank_submission_confirmed || false);
      }
      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId, token]);

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

  const handleToggleChecklist = async (itemId: string, currentState: boolean) => {
    try {
      const res = await toggleChecklistItem(caseId, itemId, !currentState, token);
      if (res.success && res.data) {
        setTracking(res.data);
        showNotification(
          "success",
          !currentState ? "Checklist item marked as completed." : "Checklist item marked as incomplete."
        );
        const dashRes = await fetchEmergencyDashboard(caseId, token);
        if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      } else {
        showNotification("error", res.error?.message || "Failed to update checklist item");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error occurred");
    }
  };

  const handleSaveReferenceNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRefs(true);
    try {
      const res = await updateReferenceNumbers(
        caseId,
        {
          ncrp_token: ncrpTokenInput,
          bank_sr_number: bankSrInput,
          police_ref: policeRefInput,
          confirm_ncrp_submitted: confirmNcrp,
          confirm_bank_submitted: confirmBank,
        },
        token
      );

      if (res.success && res.data) {
        setTracking(res.data);
        showNotification("success", "Official reference numbers and submission confirmations saved.");
        const dashRes = await fetchEmergencyDashboard(caseId, token);
        if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      } else {
        showNotification("error", res.error?.message || "Failed to save reference numbers");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save reference numbers");
    } finally {
      setIsSavingRefs(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      const res = await updateCaseTrackingStatus(
        caseId,
        {
          status: selectedStatus,
          status_change_note: statusNoteInput.trim() || undefined,
        },
        token
      );

      if (res.success && res.data) {
        setTracking(res.data);
        setStatusNoteInput("");
        showNotification("success", `Case status successfully updated to ${selectedStatus}.`);
        const dashRes = await fetchEmergencyDashboard(caseId, token);
        if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      } else {
        showNotification("error", res.error?.message || "Failed to update case status");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await addFollowUpNote(
        caseId,
        {
          note_text: newNoteText.trim(),
          category: noteCategory,
        },
        token
      );

      if (res.success && res.data) {
        setTracking(res.data);
        setNewNoteText("");
        showNotification("success", "Follow-up note logged successfully.");
      } else {
        showNotification("error", res.error?.message || "Failed to log note");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error adding note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const getStatusBadge = (status: TrackingStatus) => {
    switch (status) {
      case "REPORTED_TO_1930":
        return <Badge variant="success">Reported to 1930</Badge>;
      case "BANK_DISPUTE_SUBMITTED":
        return <Badge variant="gold">Bank Dispute Submitted</Badge>;
      case "PORTAL_COMPLAINT_FILED":
        return <Badge variant="success">Portal Complaint Filed</Badge>;
      case "UNDER_BANK_INVESTIGATION":
        return <Badge variant="default">Under Bank Investigation</Badge>;
      case "LIEN_INQUIRY_ACTIVE":
        return <Badge variant="crimson">Lien Inquiry Active</Badge>;
      case "FOLLOW_UP_COMPLETED":
        return <Badge variant="success">Follow-up Completed</Badge>;
      case "RESOLVED":
        return <Badge variant="success">Resolved</Badge>;
      case "CLOSED":
        return <Badge variant="outline">Case Closed</Badge>;
      default:
        return <Badge variant="gold">Case Initialized</Badge>;
    }
  };

  if (isLoading && !tracking) {
    return (
      <div className="p-16 text-center space-y-4">
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#172F4D] border-t-transparent animate-spin" />
        <p className="text-sm font-mono text-[#71849A]">Loading emergency case tracker and timeline...</p>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="p-12 text-center space-y-4 max-w-lg mx-auto bg-white rounded-2xl border border-[#DCE7F0] shadow-card">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-xl font-bold text-[#172F4D]">Case Not Found</h2>
        <p className="text-xs text-[#71849A]">The requested case could not be located in your profile.</p>
        <Link href="/dashboard/cases">
          <Button variant="secondary" size="sm">Back to My Cases</Button>
        </Link>
      </div>
    );
  }

  const stage10m = tracking.checklist_items.filter((i) => i.stage === "WITHIN_10_MINUTES");
  const stage1h = tracking.checklist_items.filter((i) => i.stage === "WITHIN_1_HOUR");
  const stage24h = tracking.checklist_items.filter((i) => i.stage === "WITHIN_24_HOURS");

  const completedCount = tracking.checklist_items.filter((i) => i.is_completed).length;
  const totalCount = tracking.checklist_items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE7F0] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cases">
            <Button variant="ghost" size="sm" className="p-2 text-[#71849A] hover:text-[#172F4D] hover:bg-[#E1F1FB]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-[#172F4D] text-lg">{tracking.case_number}</span>
              {getStatusBadge(tracking.current_status)}
              {tracking.golden_hour_active && (
                <Badge variant="crimson" className="text-[10px]">Golden Hour Active</Badge>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-[#172F4D] mt-0.5">{tracking.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCaseData}
            isLoading={isLoading}
            className="text-xs text-[#71849A] hover:text-[#172F4D] hover:bg-[#E1F1FB] border border-[#DCE7F0]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#172F4D]" />
            Refresh
          </Button>

          <a href="tel:1930">
            <Button variant="danger" size="sm" className="font-bold gap-1.5 shadow-card bg-[#EF4444] hover:bg-[#DC2626] text-white">
              <PhoneCall className="w-3.5 h-3.5" />
              Dial 1930
            </Button>
          </a>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <Alert
          variant={feedbackMessage.type === "success" ? "success" : "danger"}
          title={feedbackMessage.type === "success" ? "Action Recorded" : "Error"}
        >
          {feedbackMessage.text}
        </Alert>
      )}

      {/* Case Summary Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#DCE7F0] shadow-card">
          <span className="text-[11px] text-[#71849A] font-semibold block">Amount Lost</span>
          <p className="text-lg font-mono font-extrabold text-red-600 mt-0.5">
            {formatCurrency(tracking.amount_lost)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE7F0] shadow-card">
          <span className="text-[11px] text-[#71849A] font-semibold block">12-Digit UTR</span>
          <p className="text-sm font-mono font-bold text-[#172F4D] mt-0.5 truncate">
            {tracking.transaction_id_utr || "Pending"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE7F0] shadow-card">
          <span className="text-[11px] text-[#71849A] font-semibold block">Beneficiary VPA</span>
          <p className="text-xs font-mono text-[#172F4D] font-medium mt-1 truncate">
            {tracking.beneficiary_upi_id || "Not logged"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE7F0] shadow-card">
          <span className="text-[11px] text-[#71849A] font-semibold block">Case Created</span>
          <p className="text-xs text-[#172F4D] mt-1 font-mono">
            {formatDateTime(tracking.created_at)}
          </p>
        </div>
      </div>

      {/* Important Next Actions Card (Feature 4: Emergency Dashboard) */}
      <div className="p-5 rounded-2xl bg-[#E1F1FB] border border-[#DCE7F0] shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#172F4D] shrink-0" />
            <h3 className="font-bold text-[#172F4D] text-sm">Priority Next Actions (Emergency Protocol)</h3>
          </div>
          <span className="text-xs font-mono text-[#172F4D] font-bold">
            {completedCount} / {totalCount} Completed ({progressPct}%)
          </span>
        </div>

        <div className="w-full bg-[#E5F0F8] rounded-full h-2 overflow-hidden border border-[#DCE7F0]">
          <div
            className="bg-[#172F4D] h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {tracking.important_next_actions.map((act, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-[#172F4D] bg-white p-2.5 rounded-lg border border-[#DCE7F0] shadow-card"
            >
              <CheckCircle2 className="w-4 h-4 text-[#172F4D] shrink-0 mt-0.5" />
              <span className="font-medium">{act}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module Integration Sub-Navigation Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white border border-[#DCE7F0] shadow-card text-xs">
        <span className="text-[11px] font-semibold text-[#71849A] px-2">Integrated Modules:</span>
        <Link href={`/dashboard/cases/${caseId}/complaints`}>
          <span className="px-3 py-1.5 rounded-lg bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] hover:bg-[#D4EBF9] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
            <FileText className="w-3.5 h-3.5 text-[#172F4D]" />
            Generated Complaints (M6)
          </span>
        </Link>
        <Link href={`/dashboard/cases/${caseId}/verification`}>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Smart Verification (M4)
          </span>
        </Link>
        <Link href={`/dashboard/cases/${caseId}/extraction`}>
          <span className="px-3 py-1.5 rounded-lg bg-[#F1F6FB] text-[#172F4D] border border-[#DCE7F0] hover:bg-[#E1F1FB] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
            <Bot className="w-3.5 h-3.5 text-[#172F4D]" />
            AI Extraction (M3)
          </span>
        </Link>
        <Link href="/dashboard/assistant">
          <span className="px-3 py-1.5 rounded-lg bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] hover:bg-[#D4EBF9] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5 text-[#172F4D]" />
            AI Assistant (M5)
          </span>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#DCE7F0] space-x-1 sm:space-x-3 overflow-x-auto pb-1 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab("checklist")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "checklist"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Emergency Checklist ({completedCount}/{totalCount})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "timeline"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Action Timeline ({tracking.timeline.length})
        </button>
        <button
          onClick={() => setActiveTab("references")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "references"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Reference Numbers
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "notes"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Follow-up & Notes ({tracking.follow_up_notes.length})
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "documents"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Documents Ready ({tracking.ready_documents.length})
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "links"
              ? "border-[#172F4D] text-[#172F4D] font-bold"
              : "border-transparent text-[#71849A] hover:text-[#172F4D]"
          }`}
        >
          Official Links
        </button>
      </div>

      {/* TAB 1: EMERGENCY CHECKLIST */}
      {activeTab === "checklist" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Statutory Legal Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0] flex items-start gap-3 shadow-card">
            <Info className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />
            <div className="text-xs text-[#172F4D] leading-relaxed">
              <p className="font-bold text-[#172F4D]">Recommended Target Notice</p>
              <p className="mt-0.5 text-[#71849A]">
                The 10-Minute, 1-Hour, and 24-Hour action stages are recommended response targets designed to maximize inter-bank fund recovery chances, not guaranteed legal deadlines. GoldenHour does not claim complaints have been lodged until confirmed by the user. Only banks and authorized authorities can freeze accounts.
              </p>
            </div>
          </div>

          {/* STAGE 1: WITHIN 10 MINUTES */}
          <Card className="border-red-200 bg-white shadow-card overflow-hidden">
            <CardHeader className="bg-red-50/80 border-b border-red-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-bold flex items-center justify-center text-xs shadow-sm">
                    1
                  </span>
                  <div>
                    <CardTitle className="text-sm font-bold text-red-950">
                      Stage 1: WITHIN 10 MINUTES
                    </CardTitle>
                    <CardDescription className="text-xs text-red-700">
                      Immediate Golden Hour Triage to freeze scammer accounts
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="crimson" className="text-[10px]">Critical Urgency</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-[#DCE7F0]">
              {stage10m.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      className="w-4 h-4 mt-1 rounded bg-[#F1F6FB] border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                    />
                    <div className="space-y-1">
                      <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                      {item.completed_at && (
                        <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Completed on {formatDateTime(item.completed_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.action_label && (
                    <div className="shrink-0">
                      {item.action_url?.startsWith("tel:") ? (
                        <a href={item.action_url}>
                          <Button variant="danger" size="sm" className="text-xs py-1 px-3 gap-1 bg-red-600 hover:bg-red-700 text-white">
                            <PhoneCall className="w-3 h-3" />
                            {item.action_label}
                          </Button>
                        </a>
                      ) : item.action_url?.startsWith("http") ? (
                        <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                            <ExternalLink className="w-3 h-3 text-[#172F4D]" />
                            {item.action_label}
                          </Button>
                        </a>
                      ) : (
                        <Link href={item.action_url || "#"}>
                          <Button variant="secondary" size="sm" className="text-xs py-1 px-3 bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                            {item.action_label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* STAGE 2: WITHIN 1 HOUR */}
          <Card className="border-[#DCE7F0] bg-white shadow-card overflow-hidden">
            <CardHeader className="bg-[#E1F1FB] border-b border-[#DCE7F0] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#172F4D] text-white font-mono font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <div>
                    <CardTitle className="text-sm font-bold text-[#172F4D]">
                      Stage 2: WITHIN 1 HOUR
                    </CardTitle>
                    <CardDescription className="text-xs text-[#71849A] font-medium">
                      Formal complaint submission & evidence sharing
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="gold" className="text-[10px]">High Priority</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-[#DCE7F0]">
              {stage1h.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      className="w-4 h-4 mt-1 rounded bg-[#F1F6FB] border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                    />
                    <div className="space-y-1">
                      <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                      {item.completed_at && (
                        <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Completed on {formatDateTime(item.completed_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.action_label && (
                    <div className="shrink-0">
                      {item.action_url === "#ref-numbers-card" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs py-1 px-3 bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] font-bold border-[#DCE7F0]"
                          onClick={() => setActiveTab("references")}
                        >
                          {item.action_label}
                        </Button>
                      ) : item.action_url?.startsWith("http") ? (
                        <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                            <ExternalLink className="w-3 h-3 text-[#172F4D]" />
                            {item.action_label}
                          </Button>
                        </a>
                      ) : (
                        <Link href={item.action_url || "#"}>
                          <Button variant="secondary" size="sm" className="text-xs py-1 px-3 bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                            {item.action_label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* STAGE 3: WITHIN 24 HOURS */}
          <Card className="border-[#DCE7F0] bg-white shadow-card overflow-hidden">
            <CardHeader className="bg-[#F1F6FB] border-b border-[#DCE7F0] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#172F4D] text-white font-mono font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  <div>
                    <CardTitle className="text-sm font-bold text-[#172F4D]">
                      Stage 3: WITHIN 24 HOURS
                    </CardTitle>
                    <CardDescription className="text-xs text-[#71849A]">
                      Official bank escalation, status tracking & record preservation
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="text-[10px] bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]">Formal Escalation</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-[#DCE7F0]">
              {stage24h.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      className="w-4 h-4 mt-1 rounded bg-[#F1F6FB] border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                    />
                    <div className="space-y-1">
                      <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                      {item.completed_at && (
                        <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Completed on {formatDateTime(item.completed_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.action_label && (
                    <div className="shrink-0">
                      {item.action_url?.startsWith("http") ? (
                        <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                            <ExternalLink className="w-3 h-3 text-[#172F4D]" />
                            {item.action_label}
                          </Button>
                        </a>
                      ) : (
                        <Link href={item.action_url || "#"}>
                          <Button variant="secondary" size="sm" className="text-xs py-1 px-3 bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                            {item.action_label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: TIMELINE OF ACTIONS */}
      {activeTab === "timeline" && (
        <Card className="animate-fadeIn border-[#DCE7F0] bg-white shadow-card">
          <CardHeader className="border-b border-[#DCE7F0]">
            <CardTitle className="text-[#172F4D]">Action Timeline & Case Audit Trail</CardTitle>
            <CardDescription className="text-[#71849A]">
              Chronological log of user actions, evidence uploads, AI extractions, reference numbers, and status transitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DCE7F0]">
              {tracking.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-6 sm:-left-8 top-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#172F4D] border-2 border-white ring-4 ring-[#E1F1FB]" />
                  <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-1.5 hover:border-[#172F4D] transition-colors shadow-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[#172F4D] flex items-center gap-2">
                        {event.title}
                      </h4>
                      <span className="text-[10px] font-mono text-[#71849A]">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[#172F4D] leading-relaxed">{event.description}</p>
                    {event.reference_id && (
                      <span className="inline-block text-[10px] font-mono text-[#172F4D] bg-[#E1F1FB] px-2 py-0.5 rounded font-semibold border border-[#DCE7F0]">
                        Ref: {event.reference_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: REFERENCE NUMBERS */}
      {activeTab === "references" && (
        <Card className="animate-fadeIn border-[#DCE7F0] bg-white shadow-card" id="ref-numbers-card">
          <CardHeader className="border-b border-[#DCE7F0]">
            <CardTitle className="text-[#172F4D]">Manual Reference Numbers Manager</CardTitle>
            <CardDescription className="text-[#71849A]">
              Record verified complaint numbers provided by the National Cyber Helpline (1930) or your issuing bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Alert variant="warning" title="Anti-Hallucination & Legal Submission Rule">
              GoldenHour does not automatically lodge complaints with authorities. Only enter reference numbers after you have personally contacted 1930 or submitted your dispute to the bank.
            </Alert>

            <form onSubmit={handleSaveReferenceNumbers} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1930 NCRP Token */}
                <div className="space-y-2 p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                  <label className="text-xs font-semibold text-[#172F4D] block">
                    1930 NCRP Acknowledgement Token
                  </label>
                  <p className="text-[11px] text-[#71849A]">
                    Given by the 1930 helpline operator or portal confirmation SMS (e.g. 2024/NCRP/819203).
                  </p>
                  <input
                    type="text"
                    value={ncrpTokenInput}
                    onChange={(e) => setNcrpTokenInput(e.target.value)}
                    placeholder="e.g. 2024/NCRP/819203"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D] font-mono"
                  />
                  <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs text-[#172F4D]">
                    <input
                      type="checkbox"
                      checked={confirmNcrp}
                      onChange={(e) => setConfirmNcrp(e.target.checked)}
                      className="rounded bg-white border-[#DCE7F0] text-[#172F4D]"
                    />
                    <span>I confirm I personally called 1930 or submitted this on cybercrime.gov.in</span>
                  </label>
                </div>

                {/* Bank Dispute SR Number */}
                <div className="space-y-2 p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0]">
                  <label className="text-xs font-semibold text-[#172F4D] block">
                    Bank Dispute Service Request (SR) Number
                  </label>
                  <p className="text-[11px] text-[#71849A]">
                    Provided by your bank customer support when lodging unauthorized debit hold (e.g. SBI-SR-88192031).
                  </p>
                  <input
                    type="text"
                    value={bankSrInput}
                    onChange={(e) => setBankSrInput(e.target.value)}
                    placeholder="e.g. SBI-SR-88192031"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D] font-mono"
                  />
                  <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs text-[#172F4D]">
                    <input
                      type="checkbox"
                      checked={confirmBank}
                      onChange={(e) => setConfirmBank(e.target.checked)}
                      className="rounded bg-white border-[#DCE7F0] text-[#172F4D]"
                    />
                    <span>I confirm I officially shared dispute documentation with my bank</span>
                  </label>
                </div>
              </div>

              {/* Police Station Ref (Optional) */}
              <div className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-2">
                <label className="text-xs font-semibold text-[#172F4D] block">
                  Local Police Station / GD / FIR Number (Optional)
                </label>
                <input
                  type="text"
                  value={policeRefInput}
                  onChange={(e) => setPoliceRefInput(e.target.value)}
                  placeholder="e.g. Cyber Crime PS GD Entry No. 44/2024"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D] font-mono"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingRefs}
                  className="font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card"
                >
                  Save Reference Details
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: FOLLOW-UP STATUS & NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Update Card */}
          <Card className="border-[#DCE7F0] bg-white shadow-card">
            <CardHeader className="border-b border-[#DCE7F0]">
              <CardTitle className="text-[#172F4D]">Update Case Tracking Status</CardTitle>
              <CardDescription className="text-[#71849A]">
                Progress your dispute through the authorized cybercrime response lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#172F4D]">Tracking Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as TrackingStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                    >
                      <option value="CASE_INITIALIZED">Case Initialized</option>
                      <option value="EVIDENCE_VERIFIED">Evidence Verified</option>
                      <option value="REPORTED_TO_1930">Reported to 1930</option>
                      <option value="BANK_DISPUTE_SUBMITTED">Bank Dispute Submitted</option>
                      <option value="PORTAL_COMPLAINT_FILED">Portal Complaint Filed</option>
                      <option value="UNDER_BANK_INVESTIGATION">Under Bank Investigation</option>
                      <option value="LIEN_INQUIRY_ACTIVE">Lien Inquiry Active</option>
                      <option value="FOLLOW_UP_COMPLETED">Follow-up Completed</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#172F4D]">Status Transition Note (Optional)</label>
                    <input
                      type="text"
                      value={statusNoteInput}
                      onChange={(e) => setStatusNoteInput(e.target.value)}
                      placeholder="e.g. Bank nodal officer requested 3 days for lien response"
                      className="w-full px-3 py-2 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingStatus} className="bg-[#172F4D] text-white hover:bg-[#1D3B60]">
                    Update Status
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Add Follow-Up Note Card */}
          <Card className="border-[#DCE7F0] bg-white shadow-card">
            <CardHeader className="border-b border-[#DCE7F0]">
              <CardTitle className="text-[#172F4D]">Add Follow-Up Note</CardTitle>
              <CardDescription className="text-[#71849A]">
                Maintain detailed logs of phone conversations, bank meetings, and officer instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddNote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-xs font-semibold text-[#172F4D]">Category</label>
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] focus:outline-none focus:border-[#172F4D]"
                    >
                      <option value="Bank Support Call">Bank Support Call</option>
                      <option value="1930 Helpline Call">1930 Helpline Call</option>
                      <option value="Branch Manager Visit">Branch Manager Visit</option>
                      <option value="Portal Status Check">Portal Status Check</option>
                      <option value="General Follow-up">General Follow-up</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-xs font-semibold text-[#172F4D]">Note Content</label>
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={2}
                      placeholder="Enter details of conversation, names of bank officials, or next scheduled follow-up..."
                      className="w-full px-3 py-2 rounded-lg bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#71849A] focus:outline-none focus:border-[#172F4D]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isAddingNote}
                    disabled={!newNoteText.trim()}
                    className="bg-[#172F4D] text-white hover:bg-[#1D3B60] font-bold"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Save Note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notes Log */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#172F4D]" />
              Follow-Up Activity Log ({tracking.follow_up_notes.length} Entries)
            </h3>

            {tracking.follow_up_notes.length === 0 ? (
              <div className="p-8 text-center text-[#71849A] bg-white rounded-xl border border-[#DCE7F0] text-xs shadow-card">
                No follow-up notes logged yet. Use the form above to record updates.
              </div>
            ) : (
              tracking.follow_up_notes.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-white border border-[#DCE7F0] space-y-1.5 shadow-card">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172F4D] font-mono">{n.category}</span>
                    <span className="text-[10px] text-[#71849A] font-mono">{formatDateTime(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-[#172F4D] leading-relaxed">{n.note_text}</p>
                  <p className="text-[10px] text-[#71849A] font-mono">Logged by: {n.author}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINT DOCUMENTS READY */}
      {activeTab === "documents" && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-[#172F4D]">Documents Ready for Submission & Download</h3>
            <p className="text-xs text-[#71849A] mt-0.5">
              Structured legal and operational complaint packages compiled from verified case parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracking.ready_documents.map((doc) => (
              <Card key={doc.doc_type} className="p-5 flex flex-col justify-between space-y-4 border-[#DCE7F0] bg-white shadow-card">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-[#172F4D] text-sm">{doc.title}</h4>
                    <Badge variant="gold" className="text-[10px] shrink-0">
                      {doc.recommended_stage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#71849A] leading-relaxed">{doc.description}</p>
                </div>

                <div className="pt-3 border-t border-[#DCE7F0] flex items-center justify-between gap-3">
                  <Link href={doc.view_url}>
                    <Button variant="secondary" size="sm" className="text-xs bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                      Inspect & Edit Draft
                    </Button>
                  </Link>

                  <a
                    href={getComplaintPdfDownloadUrl(caseId, doc.doc_type, "en")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="primary" size="sm" className="font-bold gap-1 text-white bg-[#172F4D] hover:bg-[#1D3B60] text-xs">
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: OFFICIAL REPORTING LINKS */}
      {activeTab === "links" && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-[#172F4D]">Verified Official Cybercrime Reporting Links</h3>
            <p className="text-xs text-[#71849A] mt-0.5">
              Only interact with official Government of India and authorized banking portals. Beware of search engine phishing ads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData?.official_links.map((link) => (
              <div
                key={link.name}
                className="p-5 rounded-2xl bg-white border border-[#DCE7F0] shadow-card space-y-3 flex flex-col justify-between hover:border-[#172F4D] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-[#172F4D] text-sm">{link.name}</h4>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      {link.badge_text}
                    </span>
                  </div>
                  <p className="text-xs text-[#71849A] leading-relaxed">{link.description}</p>
                  {link.helpline_number && (
                    <p className="text-xs text-[#172F4D] font-mono font-bold">
                      Helpline: {link.helpline_number}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#DCE7F0] flex items-center justify-end">
                  {link.url.startsWith("tel:") ? (
                    <a href={link.url}>
                      <Button variant="danger" size="sm" className="gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white">
                        <PhoneCall className="w-3.5 h-3.5" />
                        Dial {link.helpline_number}
                      </Button>
                    </a>
                  ) : (
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Official Portal
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
