import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "gold" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    // Accessible touch target sizing (min 44px for md/lg, comfortable 36px for sm)
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#F1F6FB] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none";

    const sizeStyles = {
      sm: "px-3.5 py-2 text-xs min-h-[36px]",
      md: "px-5 py-2.5 text-sm min-h-[44px]",
      lg: "px-6 py-3.5 text-base font-bold min-h-[48px]",
    };

    const variantStyles = {
      primary:
        "bg-[#172F4D] text-white hover:bg-[#1D3B60] focus:ring-[#172F4D] shadow-sm border border-[#172F4D]",
      secondary:
        "bg-[#E1F1FB] text-[#172F4D] hover:bg-[#D4EBF9] border border-[#DCE7F0] focus:ring-[#477DA8]",
      danger:
        "bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444] shadow-sm border border-[#EF4444]",
      gold:
        "bg-[#172F4D] text-white hover:bg-[#1D3B60] focus:ring-[#172F4D] shadow-sm border border-[#172F4D]",
      outline:
        "border border-[#DCE7F0] text-[#172F4D] bg-white hover:bg-[#E1F1FB] hover:border-[#477DA8] focus:ring-[#172F4D]",
      ghost:
        "text-[#172F4D] hover:text-[#172F4D] hover:bg-[#E1F1FB]/60 focus:ring-[#C8D2DE]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
