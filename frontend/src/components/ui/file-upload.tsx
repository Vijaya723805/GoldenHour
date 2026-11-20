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
            ? "border-[#172F4D] bg-[#E1F1FB] scale-[1.01]"
            : "border-[#DCE7F0] bg-[#F1F6FB] hover:border-[#172F4D] hover:bg-[#E1F1FB]/50",
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
          <div className="p-4 bg-[#E1F1FB] text-[#172F4D] rounded-2xl border border-[#DCE7F0] shadow-sm">
            <UploadCloud className="w-8 h-8 text-[#172F4D]" />
          </div>

          <div>
            <p className="text-base sm:text-lg font-bold text-[#172F4D]">
              {selectedFileName ? (
                <span className="text-[#172F4D] flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-[#172F4D]" /> {selectedFileName}
                </span>
              ) : (
                "Click to upload or drag & drop evidence here"
              )}
            </p>
            <p className="text-sm text-[#71849A] mt-1 max-w-md mx-auto">
              PhonePe, Google Pay, Paytm debit receipt, bank SMS screenshot, or WhatsApp chat log
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#DCE7F0] text-xs text-[#172F4D] shadow-sm">
            <span className="font-bold">First time?</span> Just take a phone screenshot of the transaction and click here.
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#71849A] gap-2 px-1">
        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" /> Zero-Credential Guarantee: UPI PINs & OTPs are never asked or stored
        </span>
        <span className="font-mono text-[#8CA0B3] text-[11px]">Supported: PNG, JPG, WEBP, PDF (Max 15MB)</span>
      </div>
    </div>
  );
}
