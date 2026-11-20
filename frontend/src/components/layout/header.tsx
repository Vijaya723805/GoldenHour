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
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-navy-900/90 border-b border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple to-gold flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-gold transition-colors">
                Golden<span className="text-gold">Hour</span>
              </span>
              <Badge variant="gold" className="text-[10px] py-0 px-2 font-bold">Fintech Shield</Badge>
            </div>
            <p className="text-[11px] text-slate-300 font-mono tracking-tight hidden sm:block">
              UPI Cybercrime Emergency Response & Lien System
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-navy-850 border border-navy-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 shadow-sm">
            <Globe className="w-4 h-4 text-purple" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language selection"
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="en" className="bg-navy-900 text-white">English</option>
              <option value="te" className="bg-navy-900 text-white">తెలుగు (Telugu)</option>
              <option value="hi" className="bg-navy-900 text-white">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Backend Status indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-850 border border-navy-750 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-purple" />
            {apiOnline === null ? (
              <span className="text-slate-400">Verifying...</span>
            ) : apiOnline ? (
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Systems Online
              </span>
            ) : (
              <span className="text-gold font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold"></span> Standalone Mode
              </span>
            )}
          </div>

          {/* Quick Call 1930 */}
          <a
            href="tel:1930"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson-light text-xs font-bold hover:bg-crimson/30 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 text-crimson animate-pulse" />
            <span>1930 Helpline</span>
          </a>

          {/* Dashboard or Login Button */}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple text-white text-xs font-bold hover:bg-purple-hover shadow-glow transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("nav.dashboard", "Dashboard")}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 text-slate-200 text-xs font-semibold border border-navy-750 transition-colors"
              >
                <LogIn className="w-4 h-4 text-gold" />
                <span>{t("auth.sign_in", "Sign In")}</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple text-white text-xs font-bold hover:bg-purple-hover shadow-glow transition-all"
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
