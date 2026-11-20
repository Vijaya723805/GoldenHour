"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Shield } from "lucide-react";

export default function RootEntryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#F1F6FB] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#172F4D] flex items-center justify-center shadow-sm animate-pulse">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-[#172F4D] tracking-tight">
        Golden<span className="text-[#477DA8]">Hour</span>
      </h1>
      <p className="mt-1 text-xs font-mono text-[#71849A]">
        Authenticating GoldenHour session & redirecting...
      </p>
    </div>
  );
}
