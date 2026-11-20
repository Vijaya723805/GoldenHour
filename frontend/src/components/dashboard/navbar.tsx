"use client";

import React from "react";
import Link from "next/link";
import { Menu, Globe, PhoneCall, User } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Language } from "@/types";

interface DashboardNavbarProps {
  onMenuToggle: () => void;
}

export function DashboardNavbar({ onMenuToggle }: DashboardNavbarProps) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-navy-900/90 backdrop-blur-xl border-b border-navy-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="p-2.5 rounded-xl bg-navy-850 border border-navy-750 text-slate-200 hover:text-white lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{t("dash.overview", "Fintech Cyber Fraud Defense")}</span>
          </h2>
          <p className="text-[11px] text-slate-300 font-mono">
            Citizen Case ID: {user?.id.slice(0, 12) || "GH-DEMO-AUTH"} • Protected Session
          </p>
        </div>
      </div>

      {/* Right: Language Switcher, 1930 hotlink & User avatar */}
      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <div className="flex items-center gap-1.5 bg-navy-850 border border-navy-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
          <Globe className="w-4 h-4 text-purple" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="Dashboard language selection"
            className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
          >
            <option value="en" className="bg-navy-900 text-white">English</option>
            <option value="te" className="bg-navy-900 text-white">తెలుగు (Telugu)</option>
            <option value="hi" className="bg-navy-900 text-white">हिन्दी (Hindi)</option>
          </select>
        </div>

        {/* 1930 Call Hotline */}
        <a
          href="tel:1930"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson-light text-xs font-bold hover:bg-crimson/30 transition-all min-h-[38px]"
        >
          <PhoneCall className="w-3.5 h-3.5 text-crimson animate-pulse" />
          <span>1930 Helpline</span>
        </a>

        {/* User Profile Link */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 p-1.5 rounded-xl bg-navy-850 border border-navy-750 hover:border-purple/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-purple/20 text-purple-light font-bold flex items-center justify-center text-xs">
            {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden md:inline">
            {user?.full_name?.split(" ")[0] || "Profile"}
          </span>
        </Link>
      </div>
    </header>
  );
}
