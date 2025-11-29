"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showGlow?: boolean;
  animated?: boolean;
}

function Progress({
  className,
  value,
  variant = 'default',
  showGlow = false,
  animated = true,
  ...props
}: ProgressProps) {
  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const glowClasses = {
    default: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]',
    success: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    warning: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]',
    danger: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  };

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full",
          variantClasses[variant],
          animated && "transition-transform duration-500 ease-out",
          showGlow && glowClasses[variant],
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
      {/* Shimmer effect for active progress */}
      {animated && (value || 0) > 0 && (value || 0) < 100 && (
        <div
          className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
          style={{
            clipPath: `inset(0 ${100 - (value || 0)}% 0 0)`,
          }}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
