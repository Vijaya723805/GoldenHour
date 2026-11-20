import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "crimson" | "success" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-[#E1F1FB] text-[#172F4D] border-[#DCE7F0] font-semibold",
    gold: "bg-[#E1F1FB] text-[#172F4D] border-[#477DA8]/40 font-bold",
    crimson: "bg-red-50 text-red-700 border-red-200 font-bold", // strictly reserved for critical fraud alerts / 1930
    success: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold", // soft green for successful complaints / resolved
    outline: "border-[#DCE7F0] bg-white text-[#71849A] font-medium",
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
