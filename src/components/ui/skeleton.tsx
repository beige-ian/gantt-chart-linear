import { cn } from "./utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-accent rounded-md",
        shimmer && "after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-[shimmer_2s_infinite]",
        !shimmer && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

function SkeletonText({ lines = 3, className, ...props }: { lines?: number } & React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4" // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = "md", className, ...props }: { size?: "sm" | "md" | "lg" } & React.ComponentProps<"div">) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  return (
    <Skeleton
      className={cn("rounded-full", sizeClasses[size], className)}
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)} {...props}>
      <div className="flex items-center gap-3 mb-3">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4, className, ...props }: { rows?: number; cols?: number } & React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border overflow-hidden", className)} {...props}>
      {/* Header */}
      <div className="flex bg-muted/50 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 p-3 border-r last:border-r-0">
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b last:border-b-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 p-3 border-r last:border-r-0">
              <Skeleton className={cn("h-4", colIndex === 0 ? "w-32" : "w-16")} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonTable };
