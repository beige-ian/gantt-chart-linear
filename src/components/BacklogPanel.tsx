import React, { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  ChevronRight,
  Search,
  Inbox,
  GripVertical,
  ArrowUpRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { SprintTask, PRIORITY_COLORS, PRIORITY_LABELS } from '../types/sprint';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { PriorityBadge } from './ui/status-badge';

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

  // Calculate total story points
  const totalPoints = useMemo(() => {
    return unassignedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  }, [unassignedTasks]);

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

  const handleQuickAdd = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSprintId) {
      onTaskAssignToSprint(taskId, currentSprintId);
    }
  };

  const getPriorityIcon = (priority: SprintTask['priority']) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[priority] }} />;
    }
    return null;
  };

  if (unassignedTasks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'bg-secondary/50 rounded-lg border border-border',
        'transition-all duration-300',
        isExpanded ? 'mb-4' : 'mb-3'
      )}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'hover:bg-accent/30 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            isExpanded ? 'rounded-t-lg' : 'rounded-lg'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Expand Icon */}
            <ChevronRight className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )} />

            {/* Title Section */}
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                미할당 백로그
              </span>
            </div>

            {/* Count Badge */}
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-medium rounded-full">
              {unassignedTasks.length}
            </Badge>
          </div>

          {/* Right Side Stats */}
          <div className="flex items-center gap-3">
            {totalPoints > 0 && (
              <Badge variant="outline" className="h-5 text-[10px] font-normal">
                {totalPoints} pts
              </Badge>
            )}
          </div>
        </button>

        {/* Content */}
        <div className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="px-4 pb-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="태스크 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-background"
              />
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {filteredTasks.map((task) => {
                const isDragging = draggedTaskId === task.id;

                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      'group relative p-3 cursor-pointer transition-all duration-150',
                      'bg-card hover:bg-accent/50 border-border/50',
                      'hover:border-border hover:shadow-sm',
                      isDragging && 'opacity-50 scale-[0.98] rotate-1 shadow-lg'
                    )}
                  >
                    {/* Color indicator - Linear style */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />

                    {/* Drag handle (visible on hover) */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity cursor-grab">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Task Header */}
                    <div className="flex items-start justify-between gap-2 pl-1">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getPriorityIcon(task.priority)}
                        <span className="font-medium text-sm line-clamp-2 leading-tight">
                          {task.name}
                        </span>
                      </div>

                      {/* Quick Add Button */}
                      {currentSprintId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleQuickAdd(task.id, e)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-accent transition-all rounded"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            스프린트에 추가
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Task Meta - Notion style inline tags */}
                    <div className="mt-2 pl-1 flex items-center gap-1.5 flex-wrap">
                      {task.storyPoints !== undefined && task.storyPoints > 0 && (
                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                          {task.storyPoints} pts
                        </span>
                      )}
                      {task.priority !== 'none' && (
                        <PriorityBadge priority={task.priority} size="sm" />
                      )}
                    </div>

                    {/* Task Footer */}
                    <div className="mt-2 pl-1 flex items-center justify-between text-xs">
                      {/* Assignee */}
                      {task.assignee && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              {task.assigneeAvatarUrl ? (
                                <img
                                  src={task.assigneeAvatarUrl}
                                  alt={task.assignee}
                                  className="w-4 h-4 rounded-full object-cover ring-1 ring-border/50"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">
                                  {task.assignee.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="truncate max-w-[80px]">{task.assignee}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{task.assignee}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Labels */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex items-center gap-1">
                          {task.labels.slice(0, 2).map((label, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground"
                            >
                              {typeof label === 'object' ? label.name : label}
                            </span>
                          ))}
                          {task.labels.length > 2 && (
                            <span className="text-muted-foreground text-[10px]">
                              +{task.labels.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              {/* Empty Search State */}
              {filteredTasks.length === 0 && searchQuery && (
                <div className="text-center text-sm py-8 text-muted-foreground/60">
                  검색 결과 없음
                </div>
              )}
            </div>

            {/* Footer Hint */}
            {filteredTasks.length > 0 && currentSprintId && (
              <div className="text-[11px] text-muted-foreground/70 text-center pt-2">
                드래그하거나 <ArrowUpRight className="inline h-3 w-3" /> 버튼으로 스프린트에 추가
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
