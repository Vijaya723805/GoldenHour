"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, User, Phone, Building, Globe, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      router.push("/dashboard");
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
        router.push("/dashboard");
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
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2 mb-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple to-gold flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Golden<span className="text-gold">Hour</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-slate-100">
          {t("auth.register_title", "Create Citizen Account")}
        </h2>
        <p className="text-xs text-slate-400">
          {t("auth.register_subtitle", "Join India's AI-Powered UPI Fraud Defense Network")}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <Card className="border-navy-700/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson-light text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-crimson" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t("auth.full_name", "Full Legal Name")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.email", "Email Address")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.phone", "Mobile Number")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bank & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.bank", "Primary Bank")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building className="w-4 h-4" />
                    </div>
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
                      <option value="Other">Other Bank</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.language", "Preferred Language")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Globe className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white focus:outline-none focus:border-purple"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.password", "Password")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t("auth.confirm_password", "Confirm Password")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>
              </div>

              {/* Zero-Credential Banner */}
              <div className="p-3 rounded-lg bg-navy-900 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Zero-PIN Guarantee: We never store your UPI PIN, MPIN, or OTPs.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full font-semibold gap-2"
              >
                <span>{t("auth.sign_up", "Complete Registration")}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400">
              {t("auth.already_have_account", "Already have an account?")}{" "}
              <Link href="/login" className="text-gold hover:underline font-semibold">
                {t("auth.sign_in", "Sign In")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
