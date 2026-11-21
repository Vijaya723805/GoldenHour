"use client";

import React, { useState } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Globe, 
  ShieldCheck, 
  Save, 
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <h1 className="text-2xl font-bold text-[#172F4D] tracking-tight">
          {t("profile.title", "Victim Profile & Security")}
        </h1>
        <p className="text-xs sm:text-sm text-[#71849A] mt-1">
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
          <Card className="bg-white border-[#DCE7F0] shadow-card">
            <CardHeader>
              <CardTitle className="text-[#172F4D] flex items-center gap-2">
                <User className="w-5 h-5 text-[#172F4D]" />
                {t("profile.personal_info", "Personal Information & Bank Details")}
              </CardTitle>
              <CardDescription className="text-[#71849A]">
                {t(
                  "profile.personal_info_desc",
                  "These details will be used to auto-populate official complaints for Cyber Crime Cell & Bank Nodal Officers."
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.full_name", "Full Legal Name")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71849A]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                      {t("auth.email", "Email Address")}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71849A]" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB]/60 border border-[#DCE7F0] text-sm text-[#71849A] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                      {t("auth.phone", "Mobile Number")}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71849A]" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                      {t("auth.bank", "Primary Bank Name")}
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71849A]" />
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
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
                    <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                      {t("profile.pref_lang", "Preferred Language")}
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71849A]" />
                      <select
                        value={preferredLang}
                        onChange={(e) => setPreferredLang(e.target.value as Language)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors font-medium"
                      >
                        <option value="en">English</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="pt-3 border-t border-[#DCE7F0] space-y-3">
                  <p className="text-xs font-semibold text-[#172F4D]">
                    {t("profile.alerts", "Emergency Alert Notifications")}
                  </p>
                  <label className="flex items-center gap-2.5 text-xs text-[#172F4D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded bg-white border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D]"
                    />
                    <span>{t("profile.sms_alerts", "SMS alerts for recipient bank freeze confirmations")}</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-[#172F4D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded bg-white border-[#DCE7F0] text-[#172F4D] focus:ring-[#172F4D]"
                    />
                    <span>{t("profile.email_alerts", "Email copies of AI-generated complaint drafts")}</span>
                  </label>
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    className="font-bold gap-2 text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-card"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>{t("profile.save", "Save Changes")}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security Auditing & Zero-PIN Policy */}
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-card">
            <CardHeader className="pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-sm text-emerald-950">
                  {t("profile.security_notice", "Zero-PIN Security Policy")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-emerald-900 leading-relaxed">
              {t(
                "profile.security_notice",
                "Zero-PIN Security Policy: GoldenHour never asks for or stores UPI PINs, OTPs, or passwords."
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
