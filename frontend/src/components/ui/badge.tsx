import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "crimson" | "success" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-purple/20 text-purple-light border-purple/40 font-semibold",
    gold: "bg-gold/20 text-gold-light border-gold/40 font-bold",
    crimson: "bg-crimson/20 text-crimson-light border-crimson/40 font-bold",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold",
    outline: "border-navy-600 bg-navy-900/60 text-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border tracking-wide font-mono",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
