import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, CheckCircle2, Info } from "lucide-react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "danger" | "warning" | "success" | "info";
  title?: string;
}

export function Alert({ variant = "info", title, children, className, ...props }: AlertProps) {
  const variantStyles = {
    danger: {
      box: "bg-red-50 border-red-200 text-red-900",
      icon: <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
      titleColor: "text-red-950 font-bold",
    },
    warning: {
      box: "bg-amber-50 border-amber-200 text-amber-900",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      titleColor: "text-amber-950 font-bold",
    },
    success: {
      box: "bg-emerald-50 border-emerald-200 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      titleColor: "text-emerald-950 font-bold",
    },
    info: {
      box: "bg-[#E1F1FB] border-[#DCE7F0] text-[#172F4D]",
      icon: <Info className="w-5 h-5 text-[#172F4D] shrink-0 mt-0.5" />,
      titleColor: "text-[#172F4D] font-bold",
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border flex gap-3.5 shadow-sm",
        current.box,
        className
      )}
      {...props}
    >
      {current.icon}
      <div className="space-y-1 text-sm leading-relaxed">
        {title && <h5 className={cn("text-base leading-snug", current.titleColor)}>{title}</h5>}
        <div className="text-[#172F4D]">{children}</div>
      </div>
    </div>
  );
}
