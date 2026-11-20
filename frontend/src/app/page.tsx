"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  UploadCloud, 
  Clock, 
  FileCheck2, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Server, 
  ShieldCheck, 
  Sparkles,
  HelpCircle,
  ArrowRight,
  Shield,
  Layers,
  Lock,
  Building,
  Check,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { 
  fetchHealth, 
  fetchEmergencyGuidance, 
  fetchSampleEvidence, 
  uploadEvidenceFile, 
  analyzeEvidence,
  fetchSampleReport 
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { SystemHealth, EvidenceAnalysis, FraudReport, EmergencyGuidance } from "@/types";

export default function HomePage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [emergencyData, setEmergencyData] = useState<EmergencyGuidance | null>(null);
  const [analysis, setAnalysis] = useState<EvidenceAnalysis | null>(null);
  const [report, setReport] = useState<FraudReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>("State Bank of India (SBI)");

  useEffect(() => {
    fetchHealth().then((res) => {
      if (res.success && res.data) setHealth(res.data);
    });

    fetchEmergencyGuidance().then((res) => {
      if (res.success && res.data) setEmergencyData(res.data);
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const uploadRes = await uploadEvidenceFile(file);
      if (uploadRes.success && uploadRes.data?.evidence_id) {
        const analyzeRes = await analyzeEvidence(uploadRes.data.evidence_id);
        if (analyzeRes.success && analyzeRes.data) {
          setAnalysis(analyzeRes.data);
        }
      } else {
        const sampleRes = await fetchSampleEvidence();
        if (sampleRes.success && sampleRes.data) setAnalysis(sampleRes.data);
      }
    } catch {
      const sampleRes = await fetchSampleEvidence();
      if (sampleRes.success && sampleRes.data) setAnalysis(sampleRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      const [sampleRes, sampleReportRes] = await Promise.all([
        fetchSampleEvidence(),
        fetchSampleReport(),
      ]);
      if (sampleRes.success && sampleRes.data) {
        setAnalysis(sampleRes.data);
      }
      if (sampleReportRes.success && sampleReportRes.data) {
        setReport(sampleReportRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const handleApproveReport = () => {
    if (!report) return;
    setReport({
      ...report,
      user_approved: true,
      status: "APPROVED_BY_USER",
      approval_timestamp: new Date().toISOString(),
    });
  };

  const activeBank = emergencyData?.bank_contacts.find((b) => b.bank_name === selectedBank);

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-900 border border-navy-750 p-8 sm:p-12 shadow-fintech">
        {/* Subtle decorative glow accents without over-animation */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="crimson" className="text-xs px-3 py-1">
              Critical Emergency Window (0 - 120 Mins)
            </Badge>
            <Badge variant="gold" className="text-xs px-3 py-1">
              Zero-Credential Guaranteed
            </Badge>
            <Badge variant="success" className="text-xs px-3 py-1">
              Official 1930 Integration
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop UPI Fraud in the{" "}
            <span className="text-gold">
              Golden Hour
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
            The first 120 minutes following an unauthorized UPI debit determine whether stolen funds can be lien-marked and frozen before cash-out.
            Upload your transaction screenshot or chat logs. Our AI parses key identifiers, redacts sensitive PINs, and drafts
            ready-to-submit official complaints for the 1930 Cyber Cell and your bank.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="gold"
              size="lg"
              onClick={handleLoadSample}
              isLoading={isLoading}
              className="gap-2 text-navy-950 font-bold shadow-gold-glow"
            >
              <Sparkles className="w-5 h-5 text-navy-950" />
              Load Interactive Demo Evidence
            </Button>

            <a href="tel:1930">
              <Button variant="danger" size="lg" className="gap-2 font-bold shadow-crimson-glow">
                <PhoneCall className="w-5 h-5" />
                Call 1930 Cyber Helpline
              </Button>
            </a>

            <Link href="/dashboard/report">
              <Button variant="outline" size="lg" className="gap-2">
                Start Full Case Dossier <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Senior Citizen & First-Time Digital Payment User Guide */}
      <section className="rounded-2xl bg-navy-850 border border-navy-750 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <HelpCircle className="w-6 h-6 text-gold" />
              First Time Facing UPI Fraud? Plain-Language Guide
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              If you or an elderly family member sent money by mistake or fell for a scan-to-receive scam, here is what to do right now.
            </p>
          </div>
          <Badge variant="default" className="self-start sm:self-auto text-xs py-1 px-3">
            Simple 3-Step Process
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson-light font-extrabold flex items-center justify-center text-lg">
              1
            </div>
            <h3 className="text-base font-bold text-white">Do Not Panic & Dial 1930</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Call <span className="font-bold text-white">1930</span> immediately. It is the Government of India's official cybercrime helpline. They log your ticket directly to alert recipient banks.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 text-gold font-extrabold flex items-center justify-center text-lg">
              2
            </div>
            <h3 className="text-base font-bold text-white">Upload Your Receipt Here</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Take a screenshot of the transaction in PhonePe, GPay, or Paytm. Upload it below. We automatically find your <span className="text-gold font-semibold">12-digit UTR number</span>.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple/20 border border-purple/40 text-purple-light font-extrabold flex items-center justify-center text-lg">
              3
            </div>
            <h3 className="text-base font-bold text-white">Submit Generated Letter</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Download the official bank complaint PDF generated by GoldenHour and email or hand it to your branch manager to demand an immediate account lien.
            </p>
          </div>
        </div>

        {/* Jargon Buster */}
        <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Key Terms Explained:
          </span>
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span><strong className="text-gold">UTR:</strong> 12-digit Unique Transaction Reference number in your banking app.</span>
            <span><strong className="text-purple-light">VPA:</strong> The UPI ID of the scammer (e.g. name@okhdfcbank).</span>
            <span><strong className="text-emerald-400">Lien:</strong> An official hold placed on the scammer's bank account so they cannot withdraw cash.</span>
          </div>
        </div>
      </section>

      {/* Main Interactive Work Area: Upload on Left, Emergency Protocol & Bank Directory on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Evidence Upload, AI Extraction & Review */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <UploadCloud className="w-5 h-5 text-purple" />
                    Evidence Ingestion & AI Parsing
                  </CardTitle>
                  <CardDescription>
                    Upload PhonePe, Google Pay, Paytm receipts, SMS notifications, or chat logs.
                  </CardDescription>
                </div>
                <Badge variant="outline">Step 1</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <FileUpload onFileSelect={handleFileUpload} isLoading={isLoading} />

              {/* Extraction Display */}
              {analysis && (
                <div className="mt-6 p-5 rounded-xl bg-navy-950 border border-purple/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                    <span className="text-xs font-mono text-purple-light uppercase font-bold tracking-wider">
                      Extracted Parameters
                    </span>
                    <Badge variant="success">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Zero-Credential: PIN/OTP Filtered
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">12-Digit UTR / Ref No.</p>
                      <p className="font-mono font-bold text-gold text-base">
                        {analysis.transaction.transaction_id_utr || "Pending Extraction"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Amount Siphoned</p>
                      <p className="font-mono font-bold text-crimson text-base">
                        {formatCurrency(analysis.transaction.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Beneficiary (Fraudster VPA)</p>
                      <p className="font-mono text-slate-100">
                        {analysis.transaction.beneficiary_upi_id || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Detected Fraud Category</p>
                      <p className="font-semibold text-purple-light">
                        {analysis.detected_category.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-300 border-t border-navy-800">
                    <span className="text-white font-bold">Sanitized AI OCR Summary:</span>{" "}
                    {analysis.raw_text_summary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complaint Draft & User Review Approval Card */}
          {report && (
            <Card className="border-gold/40 shadow-fintech">
              <CardHeader className="bg-navy-950/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gold">
                      <FileCheck2 className="w-5 h-5 text-gold" />
                      Generated Complaint Drafts
                    </CardTitle>
                    <CardDescription>
                      Review and verify before submitting. GoldenHour never automatically files complaints without your consent.
                    </CardDescription>
                  </div>
                  <Badge variant={report.user_approved ? "success" : "gold"}>
                    {report.user_approved ? "USER APPROVED" : "PENDING CITIZEN REVIEW"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {report.complaint_drafts.map((draft, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{draft.title}</h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(draft.body_text, draft.format_type)}
                        className="gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copyStatus === draft.format_type ? "Copied!" : "Copy Draft"}
                      </Button>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-navy-900 text-slate-200 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto border border-navy-750 leading-relaxed">
                      {draft.body_text}
                    </pre>

                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="font-bold text-white">Recommended action items:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                        {draft.action_items_for_victim.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                {/* Strict User Review Confirmation */}
                <div className="p-4 rounded-xl bg-navy-900 border border-navy-750 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-200">
                    <p className="font-bold text-white text-sm">Citizen Verification Step:</p>
                    <p className="text-slate-300">
                      I have reviewed the complaint parameters (UTR, Amount, Dates) and verify them to be accurate.
                    </p>
                  </div>

                  <Button
                    variant={report.user_approved ? "secondary" : "gold"}
                    size="md"
                    onClick={handleApproveReport}
                    disabled={report.user_approved}
                    className="shrink-0 font-bold"
                  >
                    {report.user_approved ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Approved by Citizen
                      </span>
                    ) : (
                      "Approve Document Draft"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Emergency Assistance & Bank Directory */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency 1930 & Golden Hour Protocol */}
          <Card className="border-crimson/40 shadow-fintech">
            <CardHeader className="bg-crimson/10 border-b border-crimson/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-crimson-light">
                  <Clock className="w-5 h-5 text-crimson" />
                  Visual Emergency Timeline
                </CardTitle>
                <span className="font-mono text-xs bg-crimson/20 text-crimson px-2.5 py-1 rounded-full font-bold">
                  Recommended Response Targets
                </span>
              </div>
              <CardDescription className="text-slate-200">
                Action stages designed to halt fund dissipation across mule accounts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson font-extrabold flex items-center justify-center shrink-0 text-xs">
                    10m
                  </span>
                  <div className="text-xs space-y-1">
                    <h5 className="font-bold text-white text-sm">Within 10 Minutes: Call 1930 & Bank</h5>
                    <p className="text-slate-300 leading-relaxed">
                      National Cybercrime helpline logs your complaint on the CFCFRS portal to alert the beneficiary bank before cash is withdrawn at an ATM.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-gold/20 border border-gold/40 text-gold font-extrabold flex items-center justify-center shrink-0 text-xs">
                    1h
                  </span>
                  <div className="text-xs space-y-1">
                    <h5 className="font-bold text-white text-sm">Within 1 Hour: Preserve Evidence & Report</h5>
                    <p className="text-slate-300 leading-relaxed">
                      Submit complaint on cybercrime.gov.in, email transaction screenshot to your bank nodal officer, and note down the acknowledgment token.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-purple/20 border border-purple/40 text-purple-light font-extrabold flex items-center justify-center shrink-0 text-xs">
                    24h
                  </span>
                  <div className="text-xs space-y-1">
                    <h5 className="font-bold text-white text-sm">Within 24 Hours: Follow-Up on Lien Status</h5>
                    <p className="text-slate-300 leading-relaxed">
                      Contact branch manager with acknowledgment numbers. Verify if an inter-bank lien was placed on the recipient mule account.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Emergency Directory */}
          <Card>
            <CardHeader>
              <CardTitle>
                <PhoneCall className="w-5 h-5 text-gold" />
                Bank Emergency Fraud Directory
              </CardTitle>
              <CardDescription>
                Select your bank for verified 24x7 toll-free fraud helplines and SMS block codes.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5">
                  Select Your Bank:
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-750 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple min-h-[44px]"
                >
                  {emergencyData?.bank_contacts.map((bank) => (
                    <option key={bank.bank_name} value={bank.bank_name} className="bg-navy-900 text-white">
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              {activeBank && (
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-750 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Toll-Free Fraud Hotline:</span>
                    <p className="font-mono font-bold text-gold text-base mt-0.5">
                      {activeBank.toll_free_number}
                    </p>
                  </div>

                  {activeBank.emergency_fraud_sms && (
                    <div>
                      <span className="text-slate-400 font-medium">Quick SMS Block Code:</span>
                      <p className="font-mono text-purple-light font-bold mt-0.5">
                        {activeBank.emergency_fraud_sms}
                      </p>
                    </div>
                  )}

                  {activeBank.portal_url && (
                    <div>
                      <a
                        href={activeBank.portal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold hover:underline flex items-center gap-1 font-bold pt-1"
                      >
                        Official Bank Fraud Portal <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System & Architecture Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                <Server className="w-4 h-4 text-purple" />
                Backend & AI Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">FastAPI Backend:</span>
                <span className="font-mono text-emerald-400 font-bold">{health ? "Connected" : "Standby"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-mono text-slate-200">
                  {health?.database.mode || "Supabase PostgreSQL"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Vision Analysis:</span>
                <span className="font-mono text-purple-light font-bold">
                  {health?.ai_services.claude_vision || "Claude 3.5 Sonnet"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">OCR Engine:</span>
                <span className="font-mono text-slate-200">
                  {health?.ai_services.ocr_engine || "PaddleOCR / Vision Parser"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
