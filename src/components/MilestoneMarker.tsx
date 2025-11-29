import React from 'react';
import { Task } from './GanttChart';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Flag, Star, Diamond } from 'lucide-react';

interface MilestoneMarkerProps {
  task: Task;
  timelineStart: Date;
  totalDays: number;
  onClick?: () => void;
}

export function MilestoneMarker({
  task,
  timelineStart,
  totalDays,
  onClick,
}: MilestoneMarkerProps) {
  // Calculate position
  const taskDays = Math.ceil(
    (task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const leftPosition = Math.max(0, Math.min(100, (taskDays / totalDays) * 100));

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if milestone is past, current, or future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const milestoneDate = new Date(task.startDate);
  milestoneDate.setHours(0, 0, 0, 0);

  const isPast = milestoneDate < today;
  const isToday = milestoneDate.getTime() === today.getTime();
  const isCompleted = task.progress === 100;

  return (
    <div className="relative h-12 flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute transform -translate-x-1/2 cursor-pointer transition-all hover:scale-110"
            style={{ left: `${leftPosition}%` }}
            onClick={onClick}
          >
            {/* Diamond shape for milestone */}
            <div
              className={`
                w-6 h-6 transform rotate-45 rounded-sm shadow-md
                flex items-center justify-center
                transition-all duration-200
                ${isCompleted
                  ? 'bg-green-500 ring-2 ring-green-300'
                  : isPast
                    ? 'bg-red-500 ring-2 ring-red-300'
                    : isToday
                      ? 'bg-yellow-500 ring-2 ring-yellow-300 animate-pulse'
                      : 'bg-blue-500 ring-2 ring-blue-300'}
              `}
              style={{ backgroundColor: isCompleted ? '#22c55e' : task.color }}
            >
              <div className="transform -rotate-45">
                {isCompleted ? (
                  <Star className="h-3 w-3 text-white fill-white" />
                ) : (
                  <Flag className="h-3 w-3 text-white" />
                )}
              </div>
            </div>

            {/* Milestone name below */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className={`text-xs font-medium ${isCompleted ? 'text-green-600' : isPast ? 'text-red-500' : ''}`}>
                {task.name}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">{task.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(task.startDate)}
            </div>
            {task.description && (
              <div className="text-xs mt-1">{task.description}</div>
            )}
            <div className="text-xs mt-1">
              상태: {' '}
              <span className={isCompleted ? 'text-green-500' : isPast ? 'text-red-500' : 'text-blue-500'}>
                {isCompleted ? '완료' : isPast ? '지연됨' : isToday ? '오늘' : '예정'}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
