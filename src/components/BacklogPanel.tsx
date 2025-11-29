import React, { useState, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  ChevronRight,
  Search,
  Inbox,
  GripVertical,
  Plus,
  User,
  Zap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { SprintTask, PRIORITY_COLORS } from '../types/sprint';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';

interface BacklogPanelProps {
  tasks: SprintTask[];
  onTaskClick: (task: SprintTask) => void;
  onTaskAssignToSprint: (taskId: string, sprintId: string) => void;
  currentSprintId?: string;
}

// Priority config with refined colors
const PRIORITY_CONFIG = {
  urgent: { label: '긴급', color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20' },
  high: { label: '높음', color: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500/20' },
  medium: { label: '보통', color: '#eab308', bg: 'bg-yellow-500/10', text: 'text-yellow-600', ring: 'ring-yellow-500/20' },
  low: { label: '낮음', color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500', ring: 'ring-green-500/20' },
  none: { label: '', color: '#6b7280', bg: '', text: '', ring: '' },
};

export function BacklogPanel({
  tasks,
  onTaskClick,
  onTaskAssignToSprint,
  currentSprintId,
}: BacklogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

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

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (unassignedTasks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50',
        'dark:from-slate-900/80 dark:via-slate-800/50 dark:to-slate-900/80',
        'rounded-2xl border border-white/[0.08]',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_-2px_rgba(0,0,0,0.3)]',
        'backdrop-blur-xl',
        'transition-all duration-500 ease-out',
        isExpanded ? 'mb-5' : 'mb-3'
      )}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />

        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'relative w-full flex items-center justify-between px-5 py-4',
            'hover:bg-white/[0.02] transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-inset',
            isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
          )}
        >
          <div className="flex items-center gap-4">
            {/* Expand Icon */}
            <div className={cn(
              'flex items-center justify-center w-6 h-6 rounded-lg',
              'bg-white/[0.05] border border-white/[0.08]',
              'transition-all duration-300 ease-out',
              isExpanded && 'rotate-90 bg-indigo-500/20 border-indigo-500/30'
            )}>
              <ChevronRight className={cn(
                'h-3.5 w-3.5 transition-colors duration-200',
                isExpanded ? 'text-indigo-400' : 'text-white/40'
              )} />
            </div>

            {/* Title Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl',
                  'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
                  'border border-indigo-500/20',
                  'shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]'
                )}>
                  <Inbox className="h-4 w-4 text-indigo-400" />
                </div>
                {/* Notification dot */}
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900 animate-pulse" />
              </div>

              <div className="flex flex-col items-start">
                <span className="text-[13px] font-semibold text-white/90 tracking-tight">
                  미할당 백로그
                </span>
                <span className="text-[11px] text-white/40 font-medium">
                  스프린트에 추가 대기 중
                </span>
              </div>
            </div>

            {/* Count Badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'bg-indigo-500/15 border border-indigo-500/20',
              'shadow-[0_0_10px_-3px_rgba(99,102,241,0.4)]'
            )}>
              <span className="text-[11px] font-bold text-indigo-400 tabular-nums">
                {unassignedTasks.length}
              </span>
              <span className="text-[10px] text-indigo-400/60">tasks</span>
            </div>
          </div>

          {/* Right Side Stats */}
          <div className="flex items-center gap-4">
            {totalPoints > 0 && (
              <div className="flex items-center gap-1.5 text-white/40">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[12px] font-semibold tabular-nums">{totalPoints}</span>
                <span className="text-[11px]">pts</span>
              </div>
            )}
          </div>
        </button>

        {/* Content */}
        <div className={cn(
          'overflow-hidden transition-all duration-400 ease-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="px-5 pb-5 space-y-4">
            {/* Search Bar */}
            <div className="relative group">
              <div className={cn(
                'absolute inset-0 rounded-xl',
                'bg-gradient-to-r from-indigo-500/20 to-purple-500/20',
                'opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-300'
              )} />
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="태스크 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'pl-10 pr-4 h-10 text-[13px] font-medium',
                    'bg-white/[0.03] hover:bg-white/[0.05]',
                    'border-white/[0.08] hover:border-white/[0.12] focus:border-indigo-500/50',
                    'rounded-xl text-white placeholder:text-white/30',
                    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]',
                    'focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.05]',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredTasks.map((task, index) => {
                const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;
                const isHovered = hoveredTaskId === task.id;
                const isDragging = draggedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    className={cn(
                      'group relative flex items-center gap-3 p-3.5 rounded-xl',
                      'bg-white/[0.02] hover:bg-white/[0.06]',
                      'border border-white/[0.06] hover:border-white/[0.12]',
                      'cursor-grab active:cursor-grabbing',
                      'transition-all duration-200 ease-out',
                      'hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]',
                      'hover:translate-y-[-1px]',
                      'animate-in fade-in-0 slide-in-from-bottom-2',
                      isDragging && 'opacity-40 scale-[0.98] rotate-1'
                    )}
                    style={{
                      animationDelay: `${index * 40}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    {/* Priority Indicator Line */}
                    <div
                      className={cn(
                        'absolute left-0 top-3 bottom-3 w-[3px] rounded-full',
                        'transition-all duration-200',
                        isHovered && 'top-2 bottom-2'
                      )}
                      style={{ backgroundColor: priorityConfig.color }}
                    />

                    {/* Drag Handle */}
                    <div className={cn(
                      'flex items-center justify-center w-5 h-8 -ml-1',
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
                    )}>
                      <GripVertical className="h-4 w-4 text-white/20" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Title Row */}
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[13px] font-medium text-white/90 truncate',
                          'group-hover:text-white transition-colors'
                        )}>
                          {task.name}
                        </span>

                        {/* Priority Badge */}
                        {task.priority && task.priority !== 'none' && (
                          <span className={cn(
                            'flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                            priorityConfig.bg, priorityConfig.text,
                            'ring-1', priorityConfig.ring
                          )}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>

                      {/* Meta Row */}
                      <div className="flex items-center gap-3 text-[11px]">
                        {/* Assignee */}
                        {task.assignee && (
                          <div className="flex items-center gap-1.5">
                            {task.assigneeAvatarUrl ? (
                              <img
                                src={task.assigneeAvatarUrl}
                                alt={task.assignee}
                                className="w-4 h-4 rounded-full ring-1 ring-white/10"
                              />
                            ) : (
                              <div className={cn(
                                'flex items-center justify-center w-4 h-4 rounded-full',
                                'bg-gradient-to-br from-indigo-500/30 to-purple-500/30',
                                'text-[8px] font-bold text-indigo-300'
                              )}>
                                {getInitials(task.assignee)}
                              </div>
                            )}
                            <span className="text-white/50 font-medium truncate max-w-[80px]">
                              {task.assignee}
                            </span>
                          </div>
                        )}

                        {/* Story Points */}
                        {task.storyPoints && (
                          <div className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded',
                            'bg-purple-500/10 border border-purple-500/20'
                          )}>
                            <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                            <span className="text-purple-400 font-bold tabular-nums">
                              {task.storyPoints}
                            </span>
                          </div>
                        )}

                        {/* Labels */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex items-center gap-1">
                            {task.labels.slice(0, 2).map((label, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                                style={{
                                  backgroundColor: `${label.color}15`,
                                  color: label.color,
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                            {task.labels.length > 2 && (
                              <span className="text-white/30 text-[10px]">
                                +{task.labels.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Button */}
                    {currentSprintId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleQuickAdd(task.id, e)}
                            className={cn(
                              'h-8 w-8 p-0 rounded-lg',
                              'bg-transparent hover:bg-indigo-500/20',
                              'border border-transparent hover:border-indigo-500/30',
                              'opacity-0 group-hover:opacity-100',
                              'transition-all duration-200',
                              'hover:scale-110 active:scale-95',
                              'hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]'
                            )}
                          >
                            <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          스프린트에 추가
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}

              {/* Empty Search State */}
              {filteredTasks.length === 0 && searchQuery && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl mb-3',
                    'bg-white/[0.03] border border-white/[0.08]',
                    'flex items-center justify-center'
                  )}>
                    <Search className="h-5 w-5 text-white/20" />
                  </div>
                  <p className="text-[13px] font-medium text-white/40">검색 결과 없음</p>
                  <p className="text-[11px] text-white/25 mt-1">다른 검색어를 시도해보세요</p>
                </div>
              )}
            </div>

            {/* Footer Hint */}
            {filteredTasks.length > 0 && currentSprintId && (
              <div className={cn(
                'flex items-center justify-center gap-2 pt-2',
                'text-[11px] text-white/30'
              )}>
                <GripVertical className="h-3 w-3" />
                <span>드래그하거나</span>
                <ArrowUpRight className="h-3 w-3 text-indigo-400/60" />
                <span>버튼으로 스프린트에 추가</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
