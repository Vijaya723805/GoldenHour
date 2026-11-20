import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/language-context";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
  title: "GoldenHour | AI UPI Fraud Reporting & Emergency Assistance",
  description:
    "Rapid intervention platform for UPI fraud victims. AI-powered screenshot evidence analysis, 1930 emergency guidance, and bank lien complaint generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen flex flex-col bg-[#F1F6FB] text-[#172F4D] antialiased selection:bg-[#E1F1FB] selection:text-[#172F4D]">
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
