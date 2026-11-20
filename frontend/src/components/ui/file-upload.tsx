"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ShieldCheck, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200",
          dragActive
            ? "border-purple bg-purple/15 scale-[1.01]"
            : "border-navy-700 bg-navy-950/70 hover:border-purple hover:bg-navy-900/80",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center space-y-3.5">
          <div className="p-4 bg-purple/20 text-purple-light rounded-2xl border border-purple/30 shadow-glow">
            <UploadCloud className="w-8 h-8 text-purple-light" />
          </div>

          <div>
            <p className="text-base sm:text-lg font-bold text-white">
              {selectedFileName ? (
                <span className="text-gold flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-gold" /> {selectedFileName}
                </span>
              ) : (
                "Click to upload or drag & drop evidence here"
              )}
            </p>
            <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
              PhonePe, Google Pay, Paytm debit receipt, bank SMS screenshot, or WhatsApp chat log
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-750 text-xs text-slate-300">
            <span className="text-gold font-bold">First time?</span> Just take a phone screenshot of the transaction and click here.
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-2 px-1">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" /> Zero-Credential Guarantee: UPI PINs & OTPs are never asked or stored
        </span>
        <span className="font-mono text-slate-400 text-[11px]">Supported: PNG, JPG, WEBP, PDF (Max 15MB)</span>
      </div>
    </div>
  );
}
