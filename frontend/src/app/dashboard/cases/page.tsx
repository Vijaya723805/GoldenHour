"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FolderLock, 
  Plus, 
  Search, 
  FileText, 
  ImageIcon, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Eye, 
  X, 
  Trash2,
  ShieldCheck,
  Bot
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { fetchDashboardCases, fetchCaseDetail, deleteCaseEvidence } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { FraudCaseSummary, FraudCaseDetail, EvidenceItem } from "@/types";

export default function MyCasesPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [selectedCase, setSelectedCase] = useState<FraudCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadCases = async () => {
    setIsLoading(true);
    const res = await fetchDashboardCases(token);
    if (res.success && res.data) {
      setCases(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCases();
  }, [token]);

  const handleSelectCase = async (c: FraudCaseSummary) => {
    const detailRes = await fetchCaseDetail(c.id, token);
    if (detailRes.success && detailRes.data) {
      setSelectedCase(detailRes.data);
    } else {
      // Fallback
      setSelectedCase({
        ...c,
        fraud_description: "Incident details logged.",
        evidence_items: [],
      });
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!selectedCase) return;
    try {
      const res = await deleteCaseEvidence(selectedCase.id, evidenceId, token);
      if (res.success) {
        setSelectedCase({
          ...selectedCase,
          evidence_items: selectedCase.evidence_items.filter((e) => e.id !== evidenceId),
          evidence_count: Math.max(0, selectedCase.evidence_count - 1),
        });
        loadCases();
      }
    } catch (err) {
      console.error("Delete evidence failed", err);
    }
  };

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.transaction_id_utr && c.transaction_id_utr.includes(searchQuery))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t("nav.cases", "My Cases")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Active dispute cases, evidence vaults, and 1930 portal complaints.
          </p>
        </div>

        <Link href="/dashboard/report">
          <Button variant="gold" size="md" className="font-bold gap-2">
            <Plus className="w-4 h-4 text-navy-950" />
            <span>Report New Fraud</span>
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search case number, UTR, or scam type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-navy-900 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple"
        />
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">Loading cases...</div>
        ) : filteredCases.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400">No cases match your search.</div>
        ) : (
          filteredCases.map((c) => (
            <Card
              key={c.id}
              className={`p-5 cursor-pointer transition-all hover:border-purple/60 ${
                selectedCase?.id === c.id ? "border-purple ring-1 ring-purple" : ""
              }`}
              onClick={() => handleSelectCase(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gold text-sm">{c.case_number}</span>
                    {c.golden_hour_active && (
                      <Badge variant="crimson" className="text-[10px]">Golden Hour Active</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-sm mt-1">{c.title}</h3>
                  <span className="text-[11px] text-purple-light font-mono">
                    {c.fraud_category.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-extrabold text-crimson-light text-base">
                    {formatCurrency(c.amount_lost)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(c.created_at)}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
                <span>12-Digit UTR: <span className="font-mono text-slate-200">{c.transaction_id_utr || "Pending"}</span></span>
                <span className="text-purple-light font-semibold">{c.evidence_count || 0} Evidence Files</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-navy-800/60 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">Created: {formatDateTime(c.created_at)}</span>
                <Link href={`/dashboard/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-bold text-gold hover:text-gold-light hover:underline flex items-center gap-1 cursor-pointer">
                    Track Case (Module 7) &rarr;
                  </span>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Case Details & Attached Evidence Vault */}
      {selectedCase && (
        <Card className="border-gold/40 mt-6 animate-fadeIn">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-gold">
                Case Details & Evidence Vault: {selectedCase.case_number}
              </CardTitle>
              <CardDescription>{selectedCase.title}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCase(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 text-xs">
            {/* Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-navy-950 border border-navy-800">
              <div>
                <span className="text-slate-400">Amount Siphoned:</span>
                <p className="font-mono font-bold text-crimson text-base mt-0.5">
                  {formatCurrency(selectedCase.amount_lost)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">12-Digit UTR:</span>
                <p className="font-mono font-bold text-gold text-sm mt-0.5">
                  {selectedCase.transaction_id_utr || "Pending"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Beneficiary VPA:</span>
                <p className="font-mono text-slate-200 mt-0.5">
                  {selectedCase.beneficiary_upi_id || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p className="font-semibold text-emerald-400 mt-0.5">
                  {selectedCase.status}
                </p>
              </div>
            </div>

            {/* Description */}
            {selectedCase.fraud_description && (
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="font-semibold text-slate-300">Complainant Incident Statement:</span>
                <p className="text-slate-400 leading-relaxed">{selectedCase.fraud_description}</p>
              </div>
            )}

            {/* Evidence Files List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Attached Evidence Vault ({selectedCase.evidence_items?.length || 0} items)
                </h4>
                <Badge variant="outline" className="text-[10px]">Private Vault</Badge>
              </div>

              {(!selectedCase.evidence_items || selectedCase.evidence_items.length === 0) ? (
                <div className="p-6 text-center text-slate-400 bg-navy-950 rounded-xl border border-navy-800">
                  No evidence uploaded yet for this case.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCase.evidence_items.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg bg-navy-900 border border-navy-700 flex items-center justify-center text-purple shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white truncate max-w-[170px]">
                            {ev.file_name}
                          </p>
                          <button
                            onClick={() => handleDeleteEvidence(ev.id)}
                            className="text-slate-500 hover:text-crimson p-1 transition-colors"
                            title="Delete evidence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Badge variant="gold" className="text-[9px] py-0 px-1.5">
                          {ev.category.replace(/_/g, " ")}
                        </Badge>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(ev.file_size_bytes / 1024).toFixed(1)} KB • {formatDateTime(ev.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/dashboard/cases/${selectedCase.id}`}>
                <Button variant="gold" size="sm" className="gap-1.5 font-bold shadow-gold-glow text-navy-950">
                  <Clock className="w-4 h-4 text-navy-950" />
                  Emergency Tracker & Timeline (Module 7)
                </Button>
              </Link>
              <Link href={`/dashboard/cases/${selectedCase.id}/complaints`}>
                <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
                  <FileText className="w-4 h-4" />
                  Generate Complaints (Module 6)
                </Button>
              </Link>
              <Link href={`/dashboard/cases/${selectedCase.id}/verification`}>
                <Button variant="outline" size="sm" className="gap-1.5 font-bold border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Smart Evidence Verification (Module 4)
                </Button>
              </Link>
              <Link href={`/dashboard/cases/${selectedCase.id}/extraction`}>
                <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-glow">
                  <Bot className="w-4 h-4" />
                  Inspect AI Extractions (Module 3)
                </Button>
              </Link>
              <Link href="/dashboard/report">
                <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
                  <Plus className="w-4 h-4" />
                  Upload Evidence
                </Button>
              </Link>
              <a href="tel:1930">
                <Button variant="danger" size="sm" className="font-bold">
                  Call 1930 Helpline
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
