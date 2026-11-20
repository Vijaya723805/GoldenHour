"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, Sparkles, AlertCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.push("/dashboard");
      } else {
        setErrorMsg(res.error || "Invalid email or password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await demoLogin();
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Cyber Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple to-gold flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Golden<span className="text-gold">Hour</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-slate-100">
          {t("auth.login_title", "Sign In to GoldenHour")}
        </h2>
        <p className="text-xs text-slate-400">
          {t("auth.login_subtitle", "Access your rapid fraud reporting & cyber defense dashboard")}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="border-navy-700/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Hackathon Demo 1-Click Login Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple/20 via-navy-900 to-gold/20 border border-purple/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold-light flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-gold" /> For Judges & Evaluation
                </span>
                <Badge variant="gold" className="text-[10px]">Instant Demo</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Sign in instantly with a pre-configured citizen account with seeded fraud cases and evidence.
              </p>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={handleDemoSignIn}
                isLoading={isSubmitting}
                className="w-full text-xs font-bold gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-navy-950" />
                {t("auth.demo_login", "1-Click Demo Login")}
              </Button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-navy-800"></div>
              <span className="flex-shrink mx-4 text-[11px] uppercase font-mono text-slate-500">
                Or sign in with email
              </span>
              <div className="flex-grow border-t border-navy-800"></div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson-light text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-crimson" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="victim.demo@goldenhour.in"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                  />
                </div>
              </div>

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
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full font-semibold gap-2"
              >
                <span>{t("auth.sign_in", "Sign In")}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400">
              {t("auth.dont_have_account", "Don't have an account?")}{" "}
              <Link href="/register" className="text-gold hover:underline font-semibold">
                {t("auth.sign_up", "Register here")}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Emergency footer disclaimer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5 text-crimson-light font-medium">
            <PhoneCall className="w-3.5 h-3.5 text-crimson" /> Dial 1930 for immediate cyber fraud emergency
          </p>
          <p className="mt-1 text-[11px]">
            GoldenHour never asks for or stores UPI PINs, OTPs, or CVVs.
          </p>
        </div>
      </div>
    </div>
  );
}
