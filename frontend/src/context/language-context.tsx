"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language } from "@/types";
import { translations } from "@/lib/i18n";
import { formatCurrency as utilFormatCurrency, formatDateTime as utilFormatDateTime } from "@/lib/utils";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
  formatCurrency: (amount: number | null | undefined) => string;
  formatDateTime: (dateString: string | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, defaultText) => defaultText || key,
  formatCurrency: (amount) => utilFormatCurrency(amount, "en"),
  formatDateTime: (dateString) => utilFormatDateTime(dateString, "en"),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("goldenhour_lang") as Language;
    if (saved && (saved === "en" || saved === "te" || saved === "hi")) {
      setLanguageState(saved);
      if (typeof document !== "undefined") {
        document.documentElement.lang = saved;
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("goldenhour_lang", lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new CustomEvent("goldenhour_lang_change", { detail: lang }));
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language] || translations.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    return utilFormatCurrency(amount, language);
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    return utilFormatDateTime(dateString, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency, formatDateTime }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
