import React from "react";
import { ShieldAlert, FileText, ExternalLink, PhoneCall, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-navy-950 border-t border-navy-800 text-slate-300 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-navy-800">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-gold" /> GoldenHour Mission
            </h4>
            <p className="leading-relaxed text-slate-300 text-xs">
              Assists victims of UPI cyber fraud during the critical initial 2-hour window. Extracts evidence, redacts sensitive credentials, and prepares formal complaints for 1930 Cyber Cell and bank nodal desks.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-light" /> Zero-Credential Guarantee
            </h4>
            <p className="leading-relaxed text-slate-300 text-xs">
              We never ask for, store, or transmit your 4/6-digit UPI PIN, SMS OTP, CVV, or net banking password. All uploaded files are scanned and sanitized.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Emergency Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gold flex items-center gap-1.5 transition-colors text-slate-200"
                >
                  National Cybercrime Portal <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://cms.rbi.org.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gold flex items-center gap-1.5 transition-colors text-slate-200"
                >
                  RBI CMS Ombudsman Portal <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="tel:1930"
                  className="text-crimson-light font-bold flex items-center gap-1.5 hover:underline"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Cyber Helpline: 1930
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Senior & Citizen Help</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you feel confused by technical terms like UTR or VPA, use our Multilingual Assistant with Senior Citizen Mode enabled for simplified, step-by-step guidance.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <p>
            © {new Date().getFullYear()} GoldenHour. Built for UPI Fraud Incident Response. Recommended response targets, not legal advice. All complaints require citizen review prior to formal submission.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-purple-light font-mono font-medium">Next.js 14 • FastAPI • Claude AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
