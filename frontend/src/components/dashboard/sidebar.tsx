"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Shield, 
  LayoutDashboard, 
  AlertOctagon, 
  FolderLock, 
  Bot, 
  User, 
  LogOut, 
  PhoneCall,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    {
      label: t("nav.dashboard", "Dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: t("nav.report", "Report a Fraud"),
      href: "/dashboard/report",
      icon: AlertOctagon,
      badge: t("common.active", "Emergency"),
      badgeVariant: "crimson" as const,
    },
    {
      label: t("nav.cases", "My Cases"),
      href: "/dashboard/cases",
      icon: FolderLock,
      badge: null,
    },
    {
      label: t("nav.assistant", "AI Assistant"),
      href: "/dashboard/assistant",
      icon: Bot,
      badge: "AI",
      badgeVariant: "default" as const,
    },
    {
      label: t("nav.emergency", "Emergency & Tracking (M7)"),
      href: "/dashboard/emergency",
      icon: Clock,
      badge: "M7",
      badgeVariant: "gold" as const,
    },
    {
      label: t("nav.profile", "Profile & Settings"),
      href: "/dashboard/profile",
      icon: User,
      badge: null,
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#172F4D]/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-[#DCE7F0] flex flex-col transition-transform duration-200 lg:translate-x-0 shadow-card",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#DCE7F0] flex items-center justify-between bg-white">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#172F4D] flex items-center justify-center shadow-sm group-hover:bg-[#1D3B60] transition-colors">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#172F4D] tracking-tight">
                {t("nav.app_title", "GoldenHour")}
              </span>
              <span className="block text-[10px] text-[#71849A] font-mono">
                {t("dash.overview", "Cyber Fraud Defense")}
              </span>
            </div>
          </Link>
        </div>

        {/* Emergency Alert Hotlink */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-[#E1F1FB] border border-[#DCE7F0]">
          <div className="flex items-center justify-between text-xs font-bold text-[#172F4D] mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              {t("nav.national_helpline", "National Helpline")}
            </span>
            <span className="font-mono text-red-600 font-bold text-sm">1930</span>
          </div>
          <p className="text-[11px] text-[#71849A] leading-tight">
            {t(
              "nav.emergency_banner_text",
              "Dial immediately to request an inter-bank lien on the fraudster's account."
            )}
          </p>
          <a
            href="tel:1930"
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold transition-all shadow-sm min-h-[38px]"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            {t("nav.call_1930", "Call 1930 Helpline")}
          </a>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] uppercase font-mono font-bold tracking-wider text-[#71849A]">
            {t("common.actions", "Platform Menu")}
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group min-h-[44px]",
                  isActive
                    ? "bg-[#172F4D] text-white shadow-sm font-bold"
                    : "text-[#71849A] hover:text-[#172F4D] hover:bg-[#F1F6FB]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-white" : "text-[#71849A] group-hover:text-[#172F4D]"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant={item.badgeVariant || "default"} className="text-[9px] py-0 px-2">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-[#DCE7F0] bg-[#F1F6FB]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#E1F1FB] border border-[#DCE7F0] text-[#172F4D] font-bold flex items-center justify-center text-xs shrink-0">
                {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#172F4D] truncate">
                  {user?.full_name || "Citizen User"}
                </p>
                <p className="text-[10px] text-[#71849A] truncate font-mono">
                  {user?.bank_name || "Primary Bank"}
                </p>
              </div>
            </div>
            <Badge variant="success" className="text-[9px] px-1.5 py-0">{t("common.active", "Active")}</Badge>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#DCE7F0] bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-[#71849A] text-xs font-semibold transition-colors min-h-[40px] shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("nav.logout", "Log Out")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
