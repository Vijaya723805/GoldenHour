import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Language } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_MAP: Record<Language, string> = {
  en: "en-IN",
  te: "te-IN",
  hi: "hi-IN",
};

export function formatCurrency(amount: number | null | undefined, lang: Language = "en"): string {
  if (amount === null || amount === undefined) return "₹0.00";
  const locale = LOCALE_MAP[lang] || "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(dateString: string | null | undefined, lang: Language = "en"): string {
  if (!dateString) return "N/A";
  try {
    const locale = LOCALE_MAP[lang] || "en-IN";
    return new Date(dateString).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateString;
  }
}
