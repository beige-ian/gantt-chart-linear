import * as React from "react";
import { cn } from "./utils";
import { Circle, Timer, Search, CheckCircle2, Clock } from "lucide-react";

type Status = "backlog" | "todo" | "in_progress" | "in_review" | "done";
type Priority = "urgent" | "high" | "medium" | "low" | "none";

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ElementType; className: string }> = {
  backlog: {
    label: "Backlog",
    icon: Circle,
    className: "bg-status-backlog/10 text-status-backlog border-status-backlog/20",
  },
  todo: {
    label: "To Do",
    icon: Circle,
    className: "bg-status-todo/10 text-status-todo border-status-todo/20",
  },
  in_progress: {
    label: "In Progress",
    icon: Timer,
    className: "bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20",
  },
  in_review: {
    label: "In Review",
    icon: Search,
    className: "bg-status-in-review/10 text-status-in-review border-status-in-review/20",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "bg-status-done/10 text-status-done border-status-done/20",
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  urgent: {
    label: "Urgent",
    className: "bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20",
  },
  high: {
    label: "High",
    className: "bg-priority-high/10 text-priority-high border-priority-high/20",
  },
  medium: {
    label: "Medium",
    className: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
  },
  low: {
    label: "Low",
    className: "bg-priority-low/10 text-priority-low border-priority-low/20",
  },
  none: {
    label: "None",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const SIZE_CLASSES = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1.5",
  lg: "text-sm px-2.5 py-1 gap-2",
};

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function StatusBadge({
  status,
  showIcon = true,
  showLabel = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border whitespace-nowrap",
        SIZE_CLASSES[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={ICON_SIZES[size]} />}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function PriorityBadge({
  priority,
  showLabel = true,
  size = "md",
  className,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border whitespace-nowrap",
        SIZE_CLASSES[size],
        config.className,
        className
      )}
    >
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Dot-only status indicator for compact views
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        `bg-status-${status.replace("_", "-")}`,
        className
      )}
    />
  );
}

// Priority indicator bar (for cards)
export function PriorityBar({ priority, className }: { priority: Priority; className?: string }) {
  if (priority === "none") return null;

  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l",
        `bg-priority-${priority}`,
        className
      )}
    />
  );
}
