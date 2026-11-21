"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Activity, PhoneCall, LayoutDashboard, LogIn, Globe } from "lucide-react";
import { fetchHealth } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Language } from "@/types";

export function Header() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    fetchHealth().then((res) => {
      setApiOnline(res.success);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/95 border-b border-[#DCE7F0] shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#172F4D] flex items-center justify-center shadow-card group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-[#172F4D] transition-colors">
                {t("nav.app_title", "GoldenHour")}
              </span>
              <Badge variant="gold" className="text-[10px] py-0 px-2 font-bold bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0]">
                {t("nav.badge_fintech", "Fintech Shield")}
              </Badge>
            </div>
            <p className="text-[11px] text-[#71849A] font-mono tracking-tight hidden sm:block">
              {t("nav.app_subtitle", "UPI Cybercrime Emergency Response & Lien System")}
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#F1F6FB] border border-[#DCE7F0] rounded-xl px-2.5 py-1.5 text-xs text-[#172F4D] shadow-card">
            <Globe className="w-4 h-4 text-[#172F4D]" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language selection"
              className="bg-transparent text-[#172F4D] text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="en" className="bg-white text-[#172F4D]">English</option>
              <option value="te" className="bg-white text-[#172F4D]">తెలుగు (Telugu)</option>
              <option value="hi" className="bg-white text-[#172F4D]">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Backend Status indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-xs text-[#172F4D]">
            <Activity className="w-3.5 h-3.5 text-[#172F4D]" />
            {apiOnline === null ? (
              <span className="text-[#71849A]">{t("nav.verifying", "Verifying...")}</span>
            ) : apiOnline ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {t("nav.systems_online", "Systems Online")}
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t("nav.standalone_mode", "Standalone Mode")}
              </span>
            )}
          </div>

          {/* Quick Call 1930 */}
          <a
            href="tel:1930"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>{t("nav.helpline", "1930 Helpline")}</span>
          </a>

          {/* Dashboard or Login Button */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#172F4D] text-white text-xs font-bold hover:bg-[#1D3B60] shadow-card transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("nav.dashboard", "Dashboard")}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F1F6FB] hover:bg-[#E1F1FB] text-[#172F4D] text-xs font-semibold border border-[#DCE7F0] transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#172F4D]" />
                <span>{t("auth.sign_in", "Sign In")}</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#172F4D] text-white text-xs font-bold hover:bg-[#1D3B60] shadow-card transition-all"
              >
                <span>{t("auth.sign_up", "Register Free")}</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
