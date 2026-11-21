"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.replace("/dashboard");
      } else {
        setErrorMsg(res.error || "Invalid email or password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F6FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Soft Accent Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E1F1FB] rounded-full blur-3xl pointer-events-none opacity-70" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#E5F0F8] rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-[#172F4D] flex items-center justify-center shadow-sm group-hover:bg-[#1D3B60] transition-colors">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#172F4D]">
            Golden<span className="text-[#477DA8]">Hour</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-[#172F4D]">
          {t("auth.login_title", "Sign In to GoldenHour")}
        </h2>
        <p className="text-xs text-[#71849A]">
          {t("auth.login_subtitle", "Access your rapid fraud reporting & cyber defense dashboard")}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <Card className="border-[#DCE7F0] shadow-card bg-white">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="citizen@example.in"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-sm text-[#172F4D] placeholder-[#8CA0B3] focus:outline-none focus:border-[#172F4D] focus:bg-white transition-colors"
                  />
                </div>
              </div>

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
                <p className="mt-1 text-[11px] text-[#71849A]">
                  Testing/Demo accounts password: <span className="font-mono text-[#172F4D] font-semibold">Demo@1234</span>
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full font-bold gap-2 text-white bg-[#172F4D] hover:bg-[#1D3B60] shadow-sm"
              >
                <span>{t("auth.sign_in", "Sign In")}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-[#71849A]">
              {t("auth.dont_have_account", "Don't have an account?")}{" "}
              <Link href="/register" className="text-[#172F4D] hover:underline font-bold">
                {t("auth.sign_up", "Register here")}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Emergency footer disclaimer */}
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
