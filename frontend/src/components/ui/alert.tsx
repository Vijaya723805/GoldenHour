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
      box: "bg-crimson/15 border-crimson/40 text-red-100",
      icon: <ShieldAlert className="w-5 h-5 text-crimson-light shrink-0 mt-0.5" />,
      titleColor: "text-white font-bold",
    },
    warning: {
      box: "bg-gold/15 border-gold/40 text-amber-100",
      icon: <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />,
      titleColor: "text-gold font-bold",
    },
    success: {
      box: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: "text-emerald-300 font-bold",
    },
    info: {
      box: "bg-purple/15 border-purple/40 text-purple-100",
      icon: <Info className="w-5 h-5 text-purple-light shrink-0 mt-0.5" />,
      titleColor: "text-purple-light font-bold",
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border flex gap-3.5 shadow-md backdrop-blur-sm",
        current.box,
        className
      )}
      {...props}
    >
      {current.icon}
      <div className="space-y-1 text-sm leading-relaxed">
        {title && <h5 className={cn("text-base leading-snug", current.titleColor)}>{title}</h5>}
        <div className="text-slate-200">{children}</div>
      </div>
    </div>
  );
}
