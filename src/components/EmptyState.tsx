import React from 'react';
import { LucideIcon, Plus, Inbox, Search, FileX } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      'animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
      className
    )}>
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300 delay-100">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-150">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-200">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="gap-2 animate-in fade-in-0 zoom-in-95 duration-300 delay-300 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states
export function NoTasksEmptyState({ onAddTask }: { onAddTask: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="태스크가 없습니다"
      description="새로운 태스크를 추가하여 프로젝트를 시작하세요."
      action={{
        label: '태스크 추가',
        onClick: onAddTask,
      }}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description={`"${query}"에 대한 결과를 찾을 수 없습니다.`}
    />
  );
}

export function NoFilterResultsEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      icon={FileX}
      title="필터 결과가 없습니다"
      description="현재 필터 조건에 맞는 항목이 없습니다."
      action={{
        label: '필터 초기화',
        onClick: onClearFilters,
      }}
    />
  );
}

export function NoSprintsEmptyState({ onCreateSprint }: { onCreateSprint?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="스프린트가 없습니다"
      description="Linear에서 스프린트(Cycle)를 생성하거나 동기화하세요."
      action={onCreateSprint ? {
        label: '스프린트 생성',
        onClick: onCreateSprint,
      } : undefined}
    />
  );
}
