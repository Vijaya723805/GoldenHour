"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SeniorModeContextType {
  seniorMode: boolean;
  setSeniorMode: (enabled: boolean) => void;
  toggleSeniorMode: () => void;
}

const SeniorModeContext = createContext<SeniorModeContextType>({
  seniorMode: false,
  setSeniorMode: () => {},
  toggleSeniorMode: () => {},
});

export function SeniorModeProvider({ children }: { children: React.ReactNode }) {
  const [seniorMode, setSeniorModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("goldenhour_senior_mode");
      if (saved === "true") {
        setSeniorModeState(true);
        document.documentElement.classList.add("senior-mode");
      }
    }
  }, []);

  const setSeniorMode = (enabled: boolean) => {
    setSeniorModeState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("goldenhour_senior_mode", String(enabled));
      if (enabled) {
        document.documentElement.classList.add("senior-mode");
      } else {
        document.documentElement.classList.remove("senior-mode");
      }
    }
  };

  const toggleSeniorMode = () => {
    setSeniorMode(!seniorMode);
  };

  return (
    <SeniorModeContext.Provider value={{ seniorMode, setSeniorMode, toggleSeniorMode }}>
      {children}
    </SeniorModeContext.Provider>
  );
}

export function useSeniorMode() {
  return useContext(SeniorModeContext);
}
