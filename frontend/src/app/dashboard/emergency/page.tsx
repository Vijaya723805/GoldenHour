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
          // Pick the first active Golden Hour case, or the first case
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Emergency Response & Case Tracking (Module 7)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Prioritized Golden Hour action plan, interactive 3-stage checklist, and real-time case defense tracking.
          </p>
        </div>

        {/* Case Selector Dropdown */}
        {cases.length > 0 && (
          <div className="flex items-center gap-2 bg-navy-900 border border-navy-800 p-1.5 rounded-xl text-xs">
            <span className="text-slate-400 pl-2 font-medium">Tracking Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-navy-950 text-gold font-mono font-bold px-3 py-1.5 rounded-lg border border-navy-700 focus:outline-none focus:border-gold"
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-crimson via-purple to-navy-900 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-crimson-glow">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Verified Official Channel
            </span>
            <span className="text-xs text-gold font-bold">First 2-3 Hours Critical</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">National Cyber Helpline: 1930</h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-2xl leading-relaxed">
            Connected to the Citizen Financial Cyber Fraud Reporting System (CFCFRS) linking RBI, banks, and payment intermediaries in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a href="tel:1930">
            <Button variant="gold" size="lg" className="font-extrabold gap-2 text-navy-950 shadow-gold-glow">
              <PhoneCall className="w-5 h-5" />
              Dial 1930 Now
            </Button>
          </a>
          <a href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="lg" className="font-bold gap-2 text-white border-white/40 hover:bg-white/10">
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
          <Card className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Current Case Status</span>
                <Badge variant={dashboardData.golden_hour_active ? "crimson" : "gold"}>
                  {dashboardData.current_status.replace(/_/g, " ")}
                </Badge>
              </div>
              <h3 className="font-mono font-extrabold text-gold text-lg">
                {dashboardData.case_number}
              </h3>
              <p className="text-xs text-slate-300">
                Amount Lost: <span className="font-mono font-bold text-crimson-light">{formatCurrency(dashboardData.amount_lost)}</span>
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                12-Digit UTR: {dashboardData.transaction_id_utr || "Pending"}
              </p>
            </div>

            <div className="pt-3 border-t border-navy-800 mt-3">
              <Link href={`/dashboard/cases/${selectedCaseId}`}>
                <Button variant="secondary" size="sm" className="w-full text-xs font-bold gap-1">
                  Open Full Case Tracker & Audit Log
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Pending Checklist Items & Progress */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Checklist Progress</span>
                <span className="font-mono text-xs font-bold text-gold">
                  {dashboardData.completion_percentage}% Done
                </span>
              </div>

              <div className="w-full bg-navy-950 rounded-full h-2.5 overflow-hidden border border-navy-800">
                <div
                  className="bg-gradient-to-r from-purple to-gold h-full transition-all duration-500"
                  style={{ width: `${dashboardData.completion_percentage}%` }}
                />
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  Completed: <span className="font-bold text-emerald-400">{dashboardData.completed_checklist_count}</span> of{" "}
                  <span className="font-bold">{dashboardData.total_checklist_count}</span> items
                </p>
                <p className="text-[11px] text-slate-400">
                  Pending critical items: <span className="font-bold text-amber-300">{dashboardData.pending_checklist_items.length}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-navy-800 mt-3">
              <a href="#action-checklist">
                <Button variant="primary" size="sm" className="w-full text-xs font-bold">
                  View Emergency Checklist Below
                </Button>
              </a>
            </div>
          </Card>

          {/* Card 3: Follow-Up & Reference Numbers */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-400 block">Logged Reference Numbers</span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between bg-navy-950 p-2 rounded-lg border border-navy-800">
                  <span className="text-slate-400 text-[11px]">1930 NCRP Token:</span>
                  <span className="text-gold font-bold">
                    {dashboardData.reference_numbers.ncrp_acknowledgement_token || "Not logged"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-navy-950 p-2 rounded-lg border border-navy-800">
                  <span className="text-slate-400 text-[11px]">Bank SR Number:</span>
                  <span className="text-slate-200">
                    {dashboardData.reference_numbers.bank_dispute_sr_number || "Not logged"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-navy-800 mt-3">
              <Link href={`/dashboard/cases/${selectedCaseId}?tab=references`}>
                <Button variant="secondary" size="sm" className="w-full text-xs font-bold">
                  Add / Update Reference Details
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Feature 4: Important Next Actions (Contextual Priority Actions) */}
      {dashboardData && dashboardData.important_next_actions.length > 0 && (
        <Card className="border-gold/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-gold" />
                Important Next Actions
              </CardTitle>
              <Badge variant="gold">Target-Oriented Guidance</Badge>
            </div>
            <CardDescription>
              Prioritized next steps generated from pending checklist items and current investigation stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData.important_next_actions.map((act, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-navy-950 border border-navy-800 text-xs text-slate-200"
              >
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{act}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feature 1: Emergency Checklist (3 Stages: 10m, 1h, 24h) */}
      <div id="action-checklist" className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            Emergency Checklist (3 Prioritised Action Stages)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track your emergency response actions across three critical time windows. Check off items as you complete them.
          </p>
        </div>

        {/* Clear Legal Notice */}
        <div className="p-4 rounded-xl bg-navy-900 border border-gold/40 flex items-start gap-3">
          <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-gold">Notice Regarding Response Targets</p>
            <p className="mt-0.5">
              These stages represent recommended response targets to maximize inter-bank fund recovery chances, not guaranteed legal deadlines. GoldenHour does not claim complaints have been submitted unless confirmed by the user. Only banks and authorized authorities decide on freezing funds.
            </p>
          </div>
        </div>

        {/* STAGE 1: WITHIN 10 MINUTES */}
        <Card className="border-crimson/30">
          <CardHeader className="bg-crimson/10 border-b border-navy-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-crimson text-white font-mono font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <CardTitle className="text-base text-white">Stage 1: WITHIN 10 MINUTES</CardTitle>
                  <CardDescription className="text-xs text-crimson-light">
                    Immediate Golden Hour Triage to freeze scammer accounts
                  </CardDescription>
                </div>
              </div>
              <Badge variant="crimson" className="text-[10px]">Critical Urgency</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-navy-800">
            {stage10m.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-navy-950 border-navy-700 text-gold focus:ring-gold cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-slate-400" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("tel:") ? (
                      <a href={item.action_url}>
                        <Button variant="danger" size="sm" className="text-xs py-1 px-3 gap-1">
                          <PhoneCall className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : (
                      <Link href={item.action_url || "#"}>
                        <Button variant="secondary" size="sm" className="text-xs py-1 px-3">
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
        <Card className="border-gold/30">
          <CardHeader className="bg-gold/10 border-b border-navy-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gold text-navy-950 font-mono font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <CardTitle className="text-base text-white">Stage 2: WITHIN 1 HOUR</CardTitle>
                  <CardDescription className="text-xs text-amber-200">
                    Formal financial reporting, evidence transmission & reference recording
                  </CardDescription>
                </div>
              </div>
              <Badge variant="gold" className="text-[10px]">High Priority</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-navy-800">
            {stage1h.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-navy-950 border-navy-700 text-gold focus:ring-gold cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-slate-400" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : (
                      <Link href={selectedCaseId ? `/dashboard/cases/${selectedCaseId}` : "/dashboard/cases"}>
                        <Button variant="secondary" size="sm" className="text-xs py-1 px-3">
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
        <Card className="border-purple/30">
          <CardHeader className="bg-purple/10 border-b border-navy-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-purple text-white font-mono font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <CardTitle className="text-base text-white">Stage 3: WITHIN 24 HOURS</CardTitle>
                  <CardDescription className="text-xs text-purple-light">
                    Bank follow-up, status check & additional evidence preservation
                  </CardDescription>
                </div>
              </div>
              <Badge variant="default" className="text-[10px]">Formal Escalation</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-navy-800">
            {stage24h.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={isUpdatingChecklist === item.id}
                    onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="w-4 h-4 mt-1 rounded bg-navy-950 border-navy-700 text-gold focus:ring-gold cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold ${item.is_completed ? "line-through text-slate-400" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                    {item.completed_at && (
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed at {formatDateTime(item.completed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {item.action_label && (
                  <div className="shrink-0">
                    {item.action_url?.startsWith("http") ? (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {item.action_label}
                        </Button>
                      </a>
                    ) : (
                      <Link href={selectedCaseId ? `/dashboard/cases/${selectedCaseId}` : "/dashboard/cases"}>
                        <Button variant="secondary" size="sm" className="text-xs py-1 px-3">
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
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Documents Ready for Download
            </h3>
            <p className="text-xs text-slate-400">
              Download and share these generated documents directly with your bank branch and police authorities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.ready_documents.map((doc) => (
              <Card key={doc.doc_type} className="p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-xs sm:text-sm">{doc.title}</h4>
                    <Badge variant="gold" className="text-[9px]">
                      {doc.recommended_stage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{doc.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-navy-800">
                  <Link href={`/dashboard/cases/${selectedCaseId}/complaints`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      Inspect Draft
                    </Button>
                  </Link>

                  <a
                    href={getComplaintPdfDownloadUrl(selectedCaseId, doc.doc_type, "en")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="gold" size="sm" className="text-xs font-bold gap-1 text-navy-950">
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
      <Card>
        <CardHeader>
          <CardTitle>Bank Nodal Cyber Helpline Directory</CardTitle>
          <CardDescription>
            Official emergency hotlines and debit freeze SMS commands for major Indian scheduled commercial banks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guidance?.bank_contacts.map((bank) => (
              <div key={bank.bank_name} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-100">{bank.bank_name}</h4>
                  <span className="font-mono text-[10px] text-gold">{bank.short_code}</span>
                </div>
                <p className="text-slate-400">
                  Toll-Free: <span className="font-mono text-gold font-bold">{bank.toll_free_number}</span>
                </p>
                {bank.emergency_fraud_sms && (
                  <p className="text-slate-400">
                    SMS Freeze: <span className="font-mono text-purple-light">{bank.emergency_fraud_sms}</span>
                  </p>
                )}
                {bank.email && (
                  <p className="text-slate-400">
                    Fraud Email: <span className="font-mono text-slate-200">{bank.email}</span>
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
