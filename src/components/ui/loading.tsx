import * as React from "react";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Loading({ size = "md", text, className }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeClasses[size])}
      />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  text?: string;
}

export function LoadingOverlay({ text }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Loading size="lg" text={text} />
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center p-8 bg-card rounded-lg border border-border/60",
        className
      )}
    >
      <Loading text="Loading..." />
    </div>
  );
}
