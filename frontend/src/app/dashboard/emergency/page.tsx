"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PhoneCall,
  ShieldAlert,
  Clock,
  ExternalLink,
  Building,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  ArrowRight,
  Info,
  ShieldCheck,
  RefreshCw,
  FolderLock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import {
  fetchEmergencyGuidance,
  fetchDashboardCases,
  fetchCaseTracking,
  fetchEmergencyDashboard,
  toggleChecklistItem,
  getComplaintPdfDownloadUrl
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  EmergencyGuidance,
  FraudCaseSummary,
  CaseTrackingDetail,
  EmergencyDashboardData
} from "@/types";

export default function EmergencyResponseDashboardPage() {
  const { token } = useAuth();
  const [guidance, setGuidance] = useState<EmergencyGuidance | null>(null);
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [tracking, setTracking] = useState<CaseTrackingDetail | null>(null);
  const [dashboardData, setDashboardData] = useState<EmergencyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingChecklist, setIsUpdatingChecklist] = useState<string | null>(null);

  // Load cases and emergency guidance
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [guideRes, casesRes] = await Promise.all([
          fetchEmergencyGuidance(),
          fetchDashboardCases(token),
        ]);

        if (guideRes.success && guideRes.data) setGuidance(guideRes.data);
        if (casesRes.success && casesRes.data && casesRes.data.length > 0) {
          setCases(casesRes.data);
          const activeCase = casesRes.data.find((c) => c.golden_hour_active) || casesRes.data[0];
          setSelectedCaseId(activeCase.id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [token]);

  // Load selected case tracking & emergency dashboard
  useEffect(() => {
    if (!selectedCaseId) return;

    async function loadCaseDetails() {
      const [trackRes, dashRes] = await Promise.all([
        fetchCaseTracking(selectedCaseId, token),
        fetchEmergencyDashboard(selectedCaseId, token),
      ]);

      if (trackRes.success && trackRes.data) setTracking(trackRes.data);
      if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
    }

    loadCaseDetails();
  }, [selectedCaseId, token]);

  const handleToggleChecklist = async (itemId: string, currentState: boolean) => {
    if (!selectedCaseId) return;
    setIsUpdatingChecklist(itemId);
    try {
      const res = await toggleChecklistItem(selectedCaseId, itemId, !currentState, token);
      if (res.success && res.data) {
        setTracking(res.data);
        const dashRes = await fetchEmergencyDashboard(selectedCaseId, token);
        if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      }
    } finally {
      setIsUpdatingChecklist(null);
    }
  };

  const stage10m = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_10_MINUTES") || [];
  const stage1h = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_1_HOUR") || [];
  const stage24h = tracking?.checklist_items.filter((i) => i.stage === "WITHIN_24_HOURS") || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight">
            Emergency Response & Case Tracking (Module 7)
          </h1>
          <p className="text-xs sm:text-sm text-[#71849A] mt-1">
            Prioritized Golden Hour action plan, interactive 3-stage checklist, and real-time case defense tracking.
          </p>
        </div>

        {/* Case Selector Dropdown */}
        {cases.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-[#DCE7F0] p-1.5 rounded-xl text-xs shadow-card">
            <span className="text-[#71849A] pl-2 font-medium">Tracking Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-[#F1F6FB] text-[#172F4D] font-mono font-bold px-3 py-1.5 rounded-lg border border-[#DCE7F0] focus:outline-none focus:border-[#172F4D]"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} - {c.title.substring(0, 30)}...
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Feature 3: Official 1930 & Portal Callout Banner */}
      <div className="p-6 rounded-2xl bg-[#172F4D] text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono font-bold tracking-wider bg-white/15 text-white px-2.5 py-0.5 rounded-full">
              Verified Official Channel
            </span>
            <span className="text-xs text-[#E1F1FB] font-bold">First 2-3 Hours Critical</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">National Cyber Helpline: 1930</h2>
          <p className="text-xs sm:text-sm text-[#E1F1FB]/90 max-w-2xl leading-relaxed">
            Connected to the Citizen Financial Cyber Fraud Reporting System (CFCFRS) linking RBI, banks, and payment intermediaries in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a href="tel:1930">
            <Button variant="danger" size="lg" className="font-extrabold gap-2 shadow-sm bg-[#EF4444] hover:bg-[#DC2626] text-white">
              <PhoneCall className="w-5 h-5" />
              Dial 1930 Now
            </Button>
          </a>
          <a href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="lg" className="font-bold gap-2 text-white border-white/40 hover:bg-white/10 hover:text-white">
              <ExternalLink className="w-4 h-4" />
              cybercrime.gov.in
            </Button>
          </a>
        </div>
      </div>

      {/* Feature 4: Emergency Dashboard Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Current Case Status */}
          <Card className="p-5 flex flex-col justify-between bg-white border-[#DCE7F0] shadow-card">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#71849A]">Current Case Status</span>
                <Badge variant={dashboardData.golden_hour_active ? "crimson" : "gold"}>
                  {dashboardData.current_status.replace(/_/g, " ")}
                </Badge>
              </div>
              <h3 className="font-mono font-extrabold text-[#172F4D] text-lg">
                {dashboardData.case_number}
              </h3>
              <p className="text-xs text-[#172F4D]">
                Amount Lost: <span className="font-mono font-bold text-red-600">{formatCurrency(dashboardData.amount_lost)}</span>
              </p>
              <p className="text-[11px] text-[#71849A] font-mono">
                12-Digit UTR: {dashboardData.transaction_id_utr || "Pending"}
              </p>
            </div>

            <div className="pt-3 border-t border-[#DCE7F0] mt-3">
              <Link href={`/dashboard/cases/${selectedCaseId}`}>
                <Button variant="secondary" size="sm" className="w-full text-xs font-bold gap-1 bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                  Open Full Case Tracker & Audit Log
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Pending Checklist Items & Progress */}
          <Card className="p-5 flex flex-col justify-between bg-white border-[#DCE7F0] shadow-card">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#71849A]">Checklist Progress</span>
                <span className="font-mono text-xs font-bold text-[#172F4D]">
                  {dashboardData.completion_percentage}% Done
                </span>
              </div>

              <div className="w-full bg-[#E5F0F8] rounded-full h-2.5 overflow-hidden border border-[#DCE7F0]">
                <div
                  className="bg-[#172F4D] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${dashboardData.completion_percentage}%` }}
                />
              </div>

              <div className="text-xs text-[#172F4D] space-y-1">
                <p>
                  Completed: <span className="font-bold text-emerald-700">{dashboardData.completed_checklist_count}</span> of{" "}
                  <span className="font-bold text-[#172F4D]">{dashboardData.total_checklist_count}</span> items
                </p>
                <p className="text-[11px] text-[#71849A]">
                  Pending critical items: <span className="font-bold text-amber-700">{dashboardData.pending_checklist_items.length}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCE7F0] mt-3">
              <a href="#action-checklist">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60]">
                  View Emergency Checklist Below
                </Button>
              </a>
            </div>
          </Card>

          {/* Card 3: Follow-Up & Reference Numbers */}
          <Card className="p-5 flex flex-col justify-between bg-white border-[#DCE7F0] shadow-card">
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-[#71849A] block">Logged Reference Numbers</span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between bg-[#F1F6FB] p-2 rounded-lg border border-[#DCE7F0]">
                  <span className="text-[#71849A] text-[11px]">1930 NCRP Token:</span>
                  <span className="text-[#172F4D] font-bold">
                    {dashboardData.reference_numbers.ncrp_acknowledgement_token || "Not logged"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#F1F6FB] p-2 rounded-lg border border-[#DCE7F0]">
                  <span className="text-[#71849A] text-[11px]">Bank SR Number:</span>
                  <span className="text-[#172F4D]">
                    {dashboardData.reference_numbers.bank_dispute_sr_number || "Not logged"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCE7F0] mt-3">
              <Link href={`/dashboard/cases/${selectedCaseId}?tab=references`}>
                <Button variant="secondary" size="sm" className="w-full text-xs font-bold bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border-[#DCE7F0]">
                  Add / Update Reference Details
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Feature 4: Important Next Actions (Contextual Priority Actions) */}
      {dashboardData && dashboardData.important_next_actions.length > 0 && (
        <Card className="border-[#DCE7F0] bg-white shadow-card overflow-hidden">
          <CardHeader className="pb-3 bg-[#E1F1FB] border-b border-[#DCE7F0]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#172F4D] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#172F4D]" />
                Important Next Actions
              </CardTitle>
              <Badge variant="gold">Target-Oriented Guidance</Badge>
            </div>
            <CardDescription className="text-xs text-[#71849A]">
              Prioritized next steps generated from pending checklist items and current investigation stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {dashboardData.important_next_actions.map((act, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D]"
              >
                <span className="w-5 h-5 rounded-full bg-[#172F4D] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed font-medium">{act}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feature 1: Emergency Checklist (3 Stages: 10m, 1h, 24h) */}
      <div id="action-checklist" className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#172F4D] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#172F4D]" />
            Emergency Checklist (3 Prioritised Action Stages)
          </h2>
          <p className="text-xs text-[#71849A] mt-1">
            Track your emergency response actions across three critical time windows. Check off items as you complete them.
          </p>
        </div>

        {/* Clear Legal Notice */}
        <div className="p-4 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0] flex items-start gap-3 shadow-card">
          <Info className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />
          <div className="text-xs text-[#172F4D] leading-relaxed">
            <p className="font-semibold text-[#172F4D]">Notice Regarding Response Targets</p>
            <p className="mt-0.5 text-[#71849A]">
              These stages represent recommended response targets to maximize inter-bank fund recovery chances, not guaranteed legal deadlines. GoldenHour does not claim complaints have been submitted unless confirmed by the user. Only banks and authorized authorities decide on freezing funds.
            </p>
          </div>
        </div>

        {/* STAGE 1: WITHIN 10 MINUTES */}
        <Card className="border-red-200 bg-white shadow-card overflow-hidden">
          <CardHeader className="bg-red-50/80 border-b border-red-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#EF4444] text-white font-mono font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <CardTitle className="text-base text-red-950 font-bold">Stage 1: WITHIN 10 MINUTES</CardTitle>
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
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-white border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("tel:") ? (
                      <a href={item.action_url}>
                        <Button variant="danger" size="sm" className="text-xs py-1 px-3 gap-1 bg-[#EF4444] hover:bg-[#DC2626] text-white">
                          <PhoneCall className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                          <ExternalLink className="w-3 h-3" />
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
                <span className="w-7 h-7 rounded-full bg-[#172F4D] text-white font-mono font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <CardTitle className="text-base text-[#172F4D]">Stage 2: WITHIN 1 HOUR</CardTitle>
                  <CardDescription className="text-xs text-[#71849A]">
                    Formal financial reporting, evidence transmission & reference recording
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
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-white border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                          <ExternalLink className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : (
                      <Link href={selectedCaseId ? `/dashboard/cases/${selectedCaseId}` : "/dashboard/cases"}>
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
                <span className="w-7 h-7 rounded-full bg-[#71849A] text-white font-mono font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <CardTitle className="text-base text-[#172F4D]">Stage 3: WITHIN 24 HOURS</CardTitle>
                  <CardDescription className="text-xs text-[#71849A]">
                    Bank follow-up, status check & additional evidence preservation
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">Formal Escalation</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-[#DCE7F0]">
            {stage24h.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-white border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D] cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-[#71849A]" : "text-[#172F4D]"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#71849A] leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1 border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]">
                          <ExternalLink className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : (
                      <Link href={selectedCaseId ? `/dashboard/cases/${selectedCaseId}` : "/dashboard/cases"}>
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

      {/* Feature 4: Documents Ready for Download */}
      {dashboardData && dashboardData.ready_documents.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-[#172F4D] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#172F4D]" />
              Documents Ready for Download
            </h3>
            <p className="text-xs text-[#71849A]">
              Download and share these generated documents directly with your bank branch and police authorities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.ready_documents.map((doc) => (
              <Card key={doc.doc_type} className="p-4 flex flex-col justify-between space-y-3 bg-white border-[#DCE7F0] shadow-card">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[#172F4D] text-xs sm:text-sm">{doc.title}</h4>
                    <Badge variant="gold" className="text-[9px]">
                      {doc.recommended_stage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#71849A] leading-relaxed">{doc.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DCE7F0]">
                  <Link href={`/dashboard/cases/${selectedCaseId}/complaints`}>
                    <Button variant="secondary" size="sm" className="text-xs bg-white text-[#172F4D] border border-[#DCE7F0] hover:bg-[#E1F1FB]">
                      Inspect Draft
                    </Button>
                  </Link>

                  <a
                    href={getComplaintPdfDownloadUrl(selectedCaseId, doc.doc_type, "en")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="primary" size="sm" className="text-xs font-bold gap-1 text-white bg-[#172F4D] hover:bg-[#1D3B60]">
                      <Download className="w-3.5 h-3.5" />
                      PDF Download
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Feature 3: Official Bank Contact & Emergency Directory */}
      <Card className="bg-white border-[#DCE7F0] shadow-card">
        <CardHeader>
          <CardTitle className="text-[#172F4D]">Bank Nodal Cyber Helpline Directory</CardTitle>
          <CardDescription className="text-[#71849A]">
            Official emergency hotlines and debit freeze SMS commands for major Indian scheduled commercial banks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guidance?.bank_contacts.map((bank) => (
              <div key={bank.bank_name} className="p-4 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#172F4D]">{bank.bank_name}</h4>
                  <span className="font-mono text-[10px] text-[#71849A] font-bold">{bank.short_code}</span>
                </div>
                <p className="text-[#71849A]">
                  Toll-Free: <span className="font-mono text-[#172F4D] font-bold">{bank.toll_free_number}</span>
                </p>
                {bank.emergency_fraud_sms && (
                  <p className="text-[#71849A]">
                    SMS Freeze: <span className="font-mono text-[#172F4D] font-bold">{bank.emergency_fraud_sms}</span>
                  </p>
                )}
                {bank.email && (
                  <p className="text-[#71849A]">
                    Fraud Email: <span className="font-mono text-[#172F4D] font-medium">{bank.email}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
