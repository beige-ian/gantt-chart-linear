import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Inbox,
  GripVertical,
  Plus,
  Filter,
} from 'lucide-react';
import { SprintTask, PRIORITY_LABELS } from '../types/sprint';
import { PriorityBadge } from './ui/status-badge';
import { cn } from './ui/utils';

interface BacklogPanelProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onTaskAssignToSprint: (taskId: string, sprintId: string) => void;
  currentSprintId?: string;
}

export function BacklogPanel({
  tasks,
  onTaskClick,
  onTaskAssignToSprint,
  currentSprintId,
}: BacklogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filter unassigned tasks (no sprintId)
  const unassignedTasks = useMemo(() => {
    return tasks.filter(task => !task.sprintId);
  }, [tasks]);

  // Apply search filter
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return unassignedTasks;
    const query = searchQuery.toLowerCase();
    return unassignedTasks.filter(
      task =>
        task.name.toLowerCase().includes(query) ||
        task.assignee?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  }, [unassignedTasks, searchQuery]);

  const handleDragStart = (e: React.DragEvent, task: SprintTask) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.id,
      source: 'backlog',
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleQuickAdd = (taskId: string) => {
    if (currentSprintId) {
      onTaskAssignToSprint(taskId, currentSprintId);
    }
  };

  if (unassignedTasks.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-gradient-to-b from-muted/30 to-muted/10 rounded-xl border border-border/50',
      'transition-all duration-300 ease-out',
      isExpanded ? 'mb-4' : 'mb-2'
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'hover:bg-muted/30 transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-t-xl'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'transition-transform duration-200',
            isExpanded ? 'rotate-90' : ''
          )}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">미할당 백로그</span>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full animate-in fade-in-0 zoom-in-95"
          >
            {unassignedTasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{unassignedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)} pts</span>
        </div>
      </button>

      {/* Content */}
      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-out',
        isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 pb-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="태스크 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-background/50"
            />
          </div>

          {/* Task List */}
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredTasks.map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                onClick={() => onTaskClick(task)}
                className={cn(
                  'group flex items-center gap-2 p-2.5 rounded-lg',
                  'bg-background/60 hover:bg-background border border-border/40 hover:border-border',
                  'cursor-grab active:cursor-grabbing',
                  'transition-all duration-200 ease-out',
                  'hover:shadow-sm hover:scale-[1.01]',
                  'animate-in fade-in-0 slide-in-from-left-2',
                  draggedTaskId === task.id && 'opacity-50 scale-[0.98]'
                )}
                style={{
                  animationDelay: `${index * 30}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                {/* Drag Handle */}
                <div className="opacity-0 group-hover:opacity-60 transition-opacity">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Color Indicator */}
                <div
                  className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    {task.priority && task.priority !== 'none' && (
                      <PriorityBadge priority={task.priority} size="xs" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {task.assignee && (
                      <span className="flex items-center gap-1">
                        {task.assigneeAvatarUrl ? (
                          <img
                            src={task.assigneeAvatarUrl}
                            alt={task.assignee}
                            className="w-3 h-3 rounded-full"
                          />
                        ) : null}
                        {task.assignee}
                      </span>
                    )}
                    {task.storyPoints && (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {task.storyPoints}pt
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Add Button */}
                {currentSprintId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAdd(task.id);
                    }}
                    className={cn(
                      'h-7 w-7 p-0 opacity-0 group-hover:opacity-100',
                      'transition-all duration-150',
                      'hover:bg-primary/10 hover:text-primary'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {filteredTasks.length === 0 && searchQuery && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                검색 결과 없음
              </div>
            )}
          </div>

          {/* Hint */}
          {filteredTasks.length > 0 && currentSprintId && (
            <div className="text-[11px] text-muted-foreground/70 text-center pt-1">
              드래그하거나 <Plus className="inline h-3 w-3" /> 버튼으로 스프린트에 추가
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
