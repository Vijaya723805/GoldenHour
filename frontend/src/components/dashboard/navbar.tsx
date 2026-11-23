"use client";

import React from "react";
import Link from "next/link";
import { Menu, Globe, PhoneCall, Glasses } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useSeniorMode } from "@/context/senior-mode-context";
import { Language } from "@/types";

interface DashboardNavbarProps {
  onMenuToggle: () => void;
}

export function DashboardNavbar({ onMenuToggle }: DashboardNavbarProps) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useSeniorMode();

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white border-b border-[#DCE7F0] flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="p-2.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB] lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-bold text-[#172F4D] flex items-center gap-2">
            <span>{t("dash.overview", "Fintech Cyber Fraud Defense")}</span>
          </h2>
          <p className="text-[11px] text-[#71849A] font-mono">
            Citizen ID: {user?.id.slice(0, 12) || "SECURE-AUTH"} • Protected Session
          </p>
        </div>
      </div>

      {/* Right: Language Switcher, Senior Mode, 1930 hotlink & User avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Senior Citizen Accessibility Toggle */}
        <button
          onClick={toggleSeniorMode}
          type="button"
          title={seniorMode ? "Disable Senior Citizen Mode" : "Enable Senior Citizen Mode (Larger text, clearer display)"}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all min-h-[38px] ${
            seniorMode
              ? "bg-amber-100 border-amber-300 text-amber-900 shadow-sm ring-1 ring-amber-300"
              : "bg-[#F1F6FB] border-[#DCE7F0] text-[#172F4D] hover:bg-[#E1F1FB]"
          }`}
        >
          <Glasses className={`w-4 h-4 ${seniorMode ? "text-amber-800" : "text-[#477DA8]"}`} />
          <span className="hidden sm:inline">
            {seniorMode ? "Senior Mode: ON" : "Senior Mode"}
          </span>
          {seniorMode && (
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse hidden sm:inline-block" />
          )}
        </button>

        {/* Language Selector */}
        <div className="flex items-center gap-1.5 bg-[#F1F6FB] border border-[#DCE7F0] rounded-xl px-2.5 py-1.5 text-xs text-[#172F4D]">
          <Globe className="w-4 h-4 text-[#172F4D]" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="Dashboard language selection"
            className="bg-transparent text-[#172F4D] text-xs focus:outline-none cursor-pointer font-medium"
          >
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>

        {/* 1930 Call Hotline */}
        <a
          href="tel:1930"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-all min-h-[38px] shadow-sm"
        >
          <PhoneCall className="w-3.5 h-3.5 text-red-600 animate-pulse" />
          <span className="hidden md:inline">1930 Helpline</span>
          <span className="md:hidden">1930</span>
        </a>

        {/* User Profile Link */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 p-1.5 rounded-xl bg-[#F1F6FB] border border-[#DCE7F0] hover:border-[#477DA8] hover:bg-[#E1F1FB]/40 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-[#E1F1FB] text-[#172F4D] font-bold flex items-center justify-center text-xs border border-[#DCE7F0]">
            {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
          </div>
          <span className="text-xs font-semibold text-[#172F4D] hidden md:inline">
            {user?.full_name?.split(" ")[0] || "Profile"}
          </span>
        </Link>
      </div>
    </header>
  );
}
