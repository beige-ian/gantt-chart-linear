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
      'bg-[#1f2023] rounded-lg border border-[#3d3e42]',
      'transition-all duration-300 ease-out',
      isExpanded ? 'mb-4' : 'mb-2'
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'hover:bg-[#26272b] transition-colors duration-150',
          'focus:outline-none rounded-t-lg'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'transition-transform duration-200',
            isExpanded ? 'rotate-90' : ''
          )}>
            <ChevronRight className="h-4 w-4 text-[#8b8b8f]" />
          </div>
          <Inbox className="h-4 w-4 text-[#8b8b8f]" />
          <span className="font-medium text-[13px] text-[#e8e8e8]">미할당 백로그</span>
          <span className="text-[12px] text-[#8b8b8f] ml-0.5">
            {unassignedTasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#8b8b8f]">
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5c5c5f]" />
            <Input
              placeholder="태스크 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-[13px] bg-[#26272b] border-[#3d3e42] text-[#e8e8e8] placeholder:text-[#5c5c5f]"
            />
          </div>

          {/* Task List */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredTasks.map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                onClick={() => onTaskClick(task)}
                className={cn(
                  'group relative bg-[#1f2023] hover:bg-[#26272b] rounded-md p-3 cursor-grab active:cursor-grabbing',
                  'transition-all duration-150 border border-transparent hover:border-[#3d3e42]',
                  draggedTaskId === task.id && 'opacity-40 scale-[0.98]'
                )}
              >
                {/* Drag Handle */}
                <div className="absolute top-3 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                  <GripVertical className="h-3.5 w-3.5 text-[#5c5c5f]" />
                </div>

                {/* Content */}
                <div className="ml-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-1 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="text-[13px] text-[#e8e8e8] truncate">{task.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.priority && task.priority !== 'none' && (
                        <PriorityBadge priority={task.priority} size="xs" />
                      )}
                      {task.storyPoints && task.storyPoints > 0 && (
                        <span className="text-[10px] text-[#8b8b8f] bg-[#2d2e32] px-1.5 py-0.5 rounded">
                          {task.storyPoints}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.assignee && (
                        task.assigneeAvatarUrl ? (
                          <img
                            src={task.assigneeAvatarUrl}
                            alt={task.assignee}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#5e6ad2] flex items-center justify-center text-[10px] text-white font-medium">
                            {task.assignee.charAt(0).toUpperCase()}
                          </div>
                        )
                      )}
                    </div>
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
                      'absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100',
                      'transition-all duration-150',
                      'hover:bg-[#3d3e42] text-[#8b8b8f] hover:text-[#e8e8e8]'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {filteredTasks.length === 0 && searchQuery && (
              <div className="text-center py-4 text-[13px] text-[#5c5c5f]">
                검색 결과 없음
              </div>
            )}
          </div>

          {/* Hint */}
          {filteredTasks.length > 0 && currentSprintId && (
            <div className="text-[11px] text-[#5c5c5f] text-center pt-1">
              드래그하거나 <Plus className="inline h-3 w-3" /> 버튼으로 스프린트에 추가
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
