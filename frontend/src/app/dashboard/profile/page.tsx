"use client";

import React, { useState } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Globe, 
  ShieldCheck, 
  Bell, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Key
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Language } from "@/types";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [fullName, setFullName] = useState(user?.full_name || "Vikramaditya Sharma");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "+919876543210");
  const [bankName, setBankName] = useState(user?.bank_name || "Axis Bank");
  const [preferredLang, setPreferredLang] = useState<Language>(user?.preferred_language || language);
  const [emailAlerts, setEmailAlerts] = useState(user?.email_notifications ?? true);
  const [smsAlerts, setSmsAlerts] = useState(user?.sms_notifications ?? true);

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await updateProfile({
        full_name: fullName,
        phone_number: phoneNumber,
        bank_name: bankName,
        preferred_language: preferredLang,
        email_notifications: emailAlerts,
        sms_notifications: smsAlerts,
      });

      if (res.success) {
        setLanguage(preferredLang);
        setStatusMsg({
          type: "success",
          text: t("profile.saved_success", "Profile updated successfully! Language & alerts active."),
        });
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Failed to update profile.",
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "An error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {t("profile.title", "Victim Profile & Security")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {t("profile.subtitle", "Manage your contact info, preferred language, and notification alerts")}
        </p>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "success" : "danger"}>
          {statusMsg.text}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <User className="w-5 h-5 text-purple" />
                Personal Information & Bank Details
              </CardTitle>
              <CardDescription>
                These details will be used to auto-populate official complaints for Cyber Crime Cell & Bank Nodal Officers.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.full_name", "Full Legal Name")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("auth.email", "Email Address")}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || "victim.demo@goldenhour.in"}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950/60 border border-navy-800 text-sm text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("auth.phone", "Mobile Number")}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("auth.bank", "Primary Bank Name")}
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple"
                      >
                        <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                        <option value="Bank of Baroda">Bank of Baroda</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("auth.language", "Preferred Language")}
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select
                        value={preferredLang}
                        onChange={(e) => setPreferredLang(e.target.value as Language)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple"
                      >
                        <option value="en">English</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="pt-3 border-t border-navy-800 space-y-3">
                  <p className="text-xs font-semibold text-slate-300">
                    Emergency Alert Notifications
                  </p>
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded bg-navy-950 border-navy-700 text-purple focus:ring-purple"
                    />
                    <span>SMS alerts for recipient bank freeze confirmations</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded bg-navy-950 border-navy-700 text-purple focus:ring-purple"
                    />
                    <span>Email copies of AI-generated complaint drafts</span>
                  </label>
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="gold"
                    size="md"
                    isLoading={isSaving}
                    className="font-bold gap-2"
                  >
                    <Save className="w-4 h-4 text-navy-950" />
                    <span>{t("profile.save", "Save Changes")}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security Auditing & Zero-PIN Policy */}
        <div className="space-y-6">
          <Card className="border-emerald-500/40 bg-navy-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <CardTitle className="text-sm text-emerald-300">
                  Zero-Credential Policy
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                GoldenHour is built with strict privacy sandboxing:
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                <li>Never asks for UPI PIN or MPIN.</li>
                <li>Never records OTPs or passwords.</li>
                <li>Evidence screenshots are sanitized and stripped of private credentials before analysis.</li>
              </ul>
              <div className="pt-2">
                <Badge variant="success">Zero-PIN Compliant</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Account Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono text-slate-200">{user?.id.slice(0, 15)}...</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Auth Provider:</span>
                <span className="font-mono text-purple-light">Supabase Auth</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Active Language:</span>
                <span className="font-mono text-gold uppercase">{language}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <span className="font-mono text-emerald-400">Verified Citizen</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
