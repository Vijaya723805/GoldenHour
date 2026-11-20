"use client";

import React from "react";
import { PhoneCall, ShieldAlert, ExternalLink, Clock } from "lucide-react";

export function EmergencyBanner() {
  return (
    <div className="bg-gradient-to-r from-navy-950 via-crimson/25 to-navy-950 text-white px-4 py-2.5 border-b border-crimson/40 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 font-medium">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-crimson"></span>
          </span>
          <span className="font-bold tracking-wider uppercase bg-crimson/30 text-crimson-light border border-crimson/40 px-2 py-0.5 rounded text-xs">
            Emergency Priority
          </span>
          <span className="text-slate-200 font-medium text-xs sm:text-sm">
            Lost money in a UPI scam? Action in the first 2 hours gives the highest chance to freeze stolen funds.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="tel:1930"
            className="flex items-center gap-2 font-bold bg-crimson hover:bg-crimson-dark text-white px-3.5 py-1.5 rounded-lg shadow-crimson-glow text-xs sm:text-sm transition-all"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Call 1930 Helpline</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 text-xs text-slate-300 hover:text-white underline underline-offset-4"
          >
            cybercrime.gov.in <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
