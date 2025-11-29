import React from 'react';
import { Card } from './ui/card';
import { Skeleton, SkeletonAvatar } from './ui/skeleton';
import { Loader2, Calendar } from 'lucide-react';
import { cn } from './ui/utils';

export function GanttSkeleton() {
  return (
    <Card className="p-4 md:p-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Calendar className="h-4.5 w-4.5 text-primary/50" />
          </div>
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Timeline Header Skeleton */}
      <div className="flex border-b border-border mb-2 bg-muted/30 rounded-t-md">
        <div className="w-48 md:w-72 p-3 border-r border-border/50 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex-1 flex">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex-1 p-2 border-r border-border/50 last:border-r-0">
              <Skeleton className="h-3 w-10 mx-auto mb-1" />
              <Skeleton className="h-3 w-6 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Task Rows Skeleton */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex border-b border-border/50 py-1.5 hover:bg-muted/20 transition-colors"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="w-48 md:w-72 px-3 py-1.5 border-r border-border/50 flex items-center gap-2">
            <div style={{ width: `${(i % 3) * 16}px` }} />
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28 mb-1" />
              </div>
              <SkeletonAvatar size="sm" />
            </div>
          </div>
          <div className="flex-1 px-2 flex items-center relative">
            <div
              className="h-5 relative"
              style={{
                marginLeft: `${5 + i * 10}%`,
                width: `${25 + (i % 4) * 12}%`,
              }}
            >
              <Skeleton className="h-full w-full rounded-full" />
            </div>
          </div>
        </div>
      ))}

      {/* Stats Skeleton */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center gap-6 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 animate-in fade-in-50 duration-300">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-3" style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground animate-pulse">{text}</span>}
    </div>
  );
}

export function TaskRowSkeleton({ indent = 0 }: { indent?: number }) {
  return (
    <div className="flex border-b border-border/50 py-1.5 animate-in fade-in-50">
      <div className="w-48 md:w-72 px-3 py-1.5 border-r border-border/50 flex items-center gap-2">
        <div style={{ width: `${indent * 16}px` }} />
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex-1 flex items-center gap-2">
          <Skeleton className="h-3.5 w-32" />
          <SkeletonAvatar size="sm" />
        </div>
      </div>
      <div className="flex-1 px-2 flex items-center">
        <Skeleton className="h-5 w-1/3 rounded-full ml-[10%]" />
      </div>
    </div>
  );
}

export function InlineLoading({ text = '로딩 중...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md animate-in fade-in-50">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{text}</span>
    </div>
  );
}

export function FullPageLoading({ text = '데이터를 불러오는 중...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      </div>
    </div>
  );
}

export function SprintCardSkeleton() {
  return (
    <Card className="p-4 animate-in fade-in-50">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2 mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonAvatar size="sm" />
        <SkeletonAvatar size="sm" />
        <SkeletonAvatar size="sm" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </Card>
  );
}
