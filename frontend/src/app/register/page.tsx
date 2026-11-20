"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, User, Phone, Building, Globe, ArrowRight, AlertCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Language } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        email,
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        bank_name: bankName,
        preferred_language: selectedLanguage,
      });

      if (res.success) {
        setLanguage(selectedLanguage);
        router.replace("/dashboard");
      } else {
        setErrorMsg(res.error || "Failed to create account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F6FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E1F1FB] rounded-full blur-3xl pointer-events-none opacity-70" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#E5F0F8] rounded-full blur-3xl pointer-events-none" />

      {/* Brand header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2 mb-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-[#172F4D] flex items-center justify-center shadow-sm group-hover:bg-[#1D3B60] transition-colors">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#172F4D]">
            Golden<span className="text-[#477DA8]">Hour</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-[#172F4D]">
          {t("auth.register_title", "Create Citizen Account")}
        </h2>
        <p className="text-xs text-[#71849A]">
          {t("auth.register_subtitle", "Join India's AI-Powered UPI Fraud Defense Network")}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 relative z-10">
        <Card className="border-[#DCE7F0] shadow-card bg-white">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                  {t("auth.full_name", "Full Legal Name")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.email", "Email Address")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.phone", "Mobile Number")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bank & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.bank", "Primary Bank")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Building className="w-4 h-4" />
                    </div>
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
                      <option value="Other">Other Bank</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.language", "Preferred Language")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Globe className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                    >
                      <option value="en">English</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.password", "Password")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172F4D] mb-1.5">
                    {t("auth.confirm_password", "Confirm Password")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71849A]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full font-bold gap-2 text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-sm"
              >
                <span>{t("auth.register_btn", "Create Account")}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-[#71849A]">
              {t("auth.already_have_account", "Already registered?")}{" "}
              <Link href="/login" className="text-[#172F4D] hover:underline font-bold">
                {t("auth.sign_in_link", "Sign in here")}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Emergency disclaimer */}
        <div className="mt-6 text-center text-xs text-[#71849A]">
          <p className="flex items-center justify-center gap-1.5 text-red-600 font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-red-600" /> Dial 1930 for immediate cyber fraud emergency
          </p>
          <p className="mt-1 text-[11px] text-[#8CA0B3]">
            GoldenHour never asks for or stores UPI PINs, OTPs, or CVVs.
          </p>
        </div>
      </div>
    </div>
  );
}
