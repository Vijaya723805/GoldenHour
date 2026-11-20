"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  Clock, 
  FolderLock, 
  FileCheck2, 
  TrendingUp, 
  AlertOctagon, 
  Plus, 
  RefreshCw, 
  Search, 
  PhoneCall, 
  Bot, 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { fetchDashboardStats, fetchDashboardCases } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DashboardStats, FraudCaseSummary, CaseStatus } from "@/types";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "PREP" | "SUBMITTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, casesRes] = await Promise.all([
        fetchDashboardStats(token),
        fetchDashboardCases(token),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (casesRes.success && casesRes.data) {
        setCases(casesRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const filteredCases = cases.filter((c) => {
    if (filterTab === "PREP") {
      if (!["DRAFT", "IN_PREPARATION", "REVIEW_PENDING"].includes(c.status)) return false;
    } else if (filterTab === "SUBMITTED") {
      if (!["APPROVED", "LIEN_REQUESTED", "SUBMITTED_TO_CYBER_CELL", "RECOVERED"].includes(c.status)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.case_number.toLowerCase().includes(q) ||
        (c.transaction_id_utr && c.transaction_id_utr.toLowerCase().includes(q)) ||
        (c.beneficiary_upi_id && c.beneficiary_upi_id.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case "REVIEW_PENDING":
        return <Badge variant="gold">Review Pending</Badge>;
      case "IN_PREPARATION":
        return <Badge variant="default">In Preparation</Badge>;
      case "LIEN_REQUESTED":
        return <Badge variant="crimson">Lien Staged</Badge>;
      case "SUBMITTED_TO_CYBER_CELL":
        return <Badge variant="success">Submitted (1930)</Badge>;
      case "RECOVERED":
        return <Badge variant="success">Funds Recovered</Badge>;
      case "APPROVED":
        return <Badge variant="success">User Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Welcome & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] tracking-tight">
            {t("dash.welcome", "Welcome back")},{" "}
            <span className="text-[#172F4D]">{user?.full_name?.split(" ")[0] || "Citizen"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#71849A] mt-1">
            {t("dash.overview", "Fintech Cyber Fraud Defense Overview")} • Primary Bank:{" "}
            <span className="text-[#172F4D] font-semibold">{user?.bank_name || "State Bank of India"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="text-xs text-[#71849A] hover:text-[#172F4D]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          <Link href="/dashboard/report">
            <Button variant="primary" size="md" className="font-bold gap-1.5 text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-sm">
              <Plus className="w-4 h-4 text-white" />
              <span>{t("nav.report", "Report a Fraud")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Golden Hour Urgency Banner (Light Icy-Blue Information Banner) */}
      {stats && stats.active_golden_hour_cases > 0 && (
        <div className="relative overflow-hidden p-6 rounded-2xl bg-[#E1F1FB] border border-[#DCE7F0] shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-white border border-[#DCE7F0] text-red-600 shrink-0 shadow-sm">
                <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: "8s" }} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#172F4D]">
                    {t("banner.golden_hour", "Golden Hour Active")} ({stats.active_golden_hour_cases} Incident in Window)
                  </h3>
                  <Badge variant="crimson" className="text-[10px]">Critical 120-Minute Target</Badge>
                </div>
                <p className="text-xs sm:text-sm text-[#172F4D] max-w-2xl leading-relaxed">
                  {t(
                    "banner.golden_desc",
                    "You have an active incident reported within the 120-minute window. Inter-bank lien requests sent to the recipient bank have the maximum recovery rate right now."
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a href="tel:1930">
                <Button variant="danger" size="md" className="font-bold text-xs gap-1.5 shadow-sm">
                  <PhoneCall className="w-4 h-4" />
                  Call 1930
                </Button>
              </a>
              <Link href="/dashboard/emergency">
                <Button variant="primary" size="md" className="text-xs font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-sm">
                  Emergency Checklist
                </Button>
              </Link>
              <Link href="/dashboard/cases">
                <Button variant="secondary" size="md" className="text-xs bg-white text-[#172F4D] border border-[#DCE7F0] hover:bg-[#F1F6FB]">
                  {t("banner.action", "View Active Case")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Senior Citizen & First-Time User Plain-Language Helper Card */}
      <div className="p-4 rounded-2xl bg-white border border-[#DCE7F0] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0] shrink-0">
            <HelpCircle className="w-5 h-5 text-[#172F4D]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#172F4D]">Need Simple Guidance?</h4>
            <p className="text-xs text-[#71849A] mt-0.5">
              Not sure how to talk to your bank or find your 12-digit UTR? Our Multilingual AI Assistant has a dedicated Senior Citizen mode in English, Telugu, and Hindi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <Link href="/dashboard/assistant" className="w-full md:w-auto">
            <Button variant="outline" size="sm" className="w-full md:w-auto text-xs gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              Open Assistant
            </Button>
          </Link>
          <Link href="/dashboard/emergency" className="w-full md:w-auto">
            <Button variant="secondary" size="sm" className="w-full md:w-auto text-xs">
              Checklist & Links
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards (Requirement 3: Elegant light-blue icon containers, Soft green for success) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Cases */}
        <Card className="hover:border-[#477DA8] transition-all">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#71849A]">
                {t("dash.total_cases", "Total Fraud Cases")}
              </span>
              <div className="p-2.5 rounded-xl bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0]">
                <FolderLock className="w-4 h-4 text-[#172F4D]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] font-mono">
                {isLoading ? "--" : stats?.total_cases || 0}
              </span>
              <span className="text-[11px] text-[#71849A] font-medium">Logged</span>
            </div>
            <p className="text-[11px] text-[#8CA0B3] pt-2 border-t border-[#DCE7F0]">
              Total incidents filed in account
            </p>
          </CardContent>
        </Card>

        {/* Cases in Preparation */}
        <Card className="hover:border-[#477DA8] transition-all">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#71849A]">
                {t("dash.in_preparation", "Cases in Preparation")}
              </span>
              <div className="p-2.5 rounded-xl bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0]">
                <AlertOctagon className="w-4 h-4 text-[#172F4D]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#172F4D] font-mono">
                {isLoading ? "--" : stats?.cases_in_preparation || 0}
              </span>
              <span className="text-[11px] text-amber-700 font-bold">Draft / Review</span>
            </div>
            <p className="text-[11px] text-[#8CA0B3] pt-2 border-t border-[#DCE7F0]">
              Requires evidence or user verification
            </p>
          </CardContent>
        </Card>

        {/* Submitted Complaints (Soft green for successful complaints) */}
        <Card className="hover:border-[#477DA8] transition-all">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#71849A]">
                {t("dash.submitted", "Submitted Complaints")}
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
                {isLoading ? "--" : stats?.submitted_complaints || 0}
              </span>
              <span className="text-[11px] text-emerald-800 font-bold">1930 / Portal</span>
            </div>
            <p className="text-[11px] text-[#8CA0B3] pt-2 border-t border-[#DCE7F0]">
              Approved and lodged with authorities
            </p>
          </CardContent>
        </Card>

        {/* Recovered / Lien Staged */}
        <Card className="hover:border-[#477DA8] transition-all">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#71849A]">
                {t("dash.recovered", "Recovered / Lien Staged")}
              </span>
              <div className="p-2.5 rounded-xl bg-[#E1F1FB] text-[#172F4D] border border-[#DCE7F0]">
                <TrendingUp className="w-4 h-4 text-[#172F4D]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-extrabold text-[#172F4D] font-mono">
                {isLoading ? "--" : formatCurrency(stats?.total_amount_recovered || 0)}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">Lien Staged</span>
            </div>
            <p className="text-[11px] text-[#8CA0B3] pt-2 border-t border-[#DCE7F0]">
              Of {formatCurrency(stats?.total_amount_defrauded || 0)} defrauded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Section: Filters, Search, and Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t("table.recent_cases", "Recently Created Cases")}</CardTitle>
            <CardDescription>
              Real-time tracking of fraudulent transactions, evidence status, and cyber cell reports.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex rounded-xl bg-[#F1F6FB] p-1 border border-[#DCE7F0] text-xs">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                  filterTab === "ALL" ? "bg-[#172F4D] text-white shadow-sm" : "text-[#71849A] hover:text-[#172F4D]"
                }`}
              >
                {t("table.filter_all", "All Cases")}
              </button>
              <button
                onClick={() => setFilterTab("PREP")}
                className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                  filterTab === "PREP" ? "bg-[#172F4D] text-white shadow-sm" : "text-[#71849A] hover:text-[#172F4D]"
                }`}
              >
                {t("table.filter_prep", "In Prep")}
              </button>
              <button
                onClick={() => setFilterTab("SUBMITTED")}
                className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                  filterTab === "SUBMITTED" ? "bg-[#172F4D] text-white shadow-sm" : "text-[#71849A] hover:text-[#172F4D]"
                }`}
              >
                {t("table.filter_submitted", "Submitted")}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8CA0B3]" />
              <input
                type="text"
                placeholder="Search UTR or Case..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white w-44 sm:w-56 transition-colors"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#172F4D] border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-[#71849A]">Loading cases from database...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F1F6FB] border border-[#DCE7F0] flex items-center justify-center text-[#71849A]">
                <FolderLock className="w-6 h-6 text-[#172F4D]" />
              </div>
              <p className="text-sm font-bold text-[#172F4D]">
                {t("table.empty", "No fraud cases found.")}
              </p>
              <p className="text-xs text-[#71849A]">
                Start by reporting an incident or uploading evidence.
              </p>
              <Link href="/dashboard/report">
                <Button variant="primary" size="sm" className="mt-2 text-xs font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60]">
                  Report a Fraud Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1F6FB] border-b border-[#DCE7F0] text-[#71849A] font-mono uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">{t("table.case_id", "Case ID")}</th>
                    <th className="py-3.5 px-4 font-bold">{t("table.title", "Incident Title")}</th>
                    <th className="py-3.5 px-4 font-bold">{t("table.amount", "Amount")}</th>
                    <th className="py-3.5 px-4 font-bold">12-Digit UTR</th>
                    <th className="py-3.5 px-4 font-bold">Beneficiary VPA</th>
                    <th className="py-3.5 px-4 font-bold">{t("table.status", "Status")}</th>
                    <th className="py-3.5 px-4 font-bold">{t("table.date", "Date")}</th>
                    <th className="py-3.5 px-4 text-right font-bold">{t("table.action", "Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE7F0]">
                  {filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F1F6FB]/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#172F4D]">
                        {c.case_number}
                        {c.golden_hour_active && (
                          <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-[#172F4D] truncate">{c.title}</p>
                        <span className="text-[10px] text-[#71849A] font-mono">
                          {c.fraud_category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                        {formatCurrency(c.amount_lost)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#172F4D]">
                        {c.transaction_id_utr || "Pending"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#71849A]">
                        {c.beneficiary_upi_id || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="py-3.5 px-4 text-[#71849A] whitespace-nowrap">
                        {formatDateTime(c.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/cases/${c.id}`}>
                            <Button variant="primary" size="sm" className="text-xs py-1 px-3 font-bold text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-sm">
                              Track
                            </Button>
                          </Link>
                          <Link href={`/dashboard/cases/${c.id}/complaints`}>
                            <Button variant="secondary" size="sm" className="text-xs py-1 px-2.5">
                              Complaints
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
