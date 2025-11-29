import React, { useState, useRef, useCallback } from 'react';
import { Task } from './GanttChart';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { User, Flag } from 'lucide-react';

interface TaskBarProps {
  task: Task;
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  isSubtask?: boolean;
  isParent?: boolean;
  level?: number;
  onDateChange?: (taskId: string, newStartDate: Date, newEndDate: Date) => void;
  onDragEnd?: (taskId: string) => void;
  onProgressChange?: (taskId: string, progress: number) => void;
  showTooltips?: boolean;
  showProgress?: boolean;
  barStyle?: 'rounded' | 'square' | 'pill';
  rowHeight?: 'compact' | 'default' | 'comfortable';
  timelineContainerRef?: React.RefObject<HTMLDivElement>;
}

export function TaskBar({
  task,
  timelineStart,
  totalDays,
  isSubtask = false,
  isParent = false,
  level = 0,
  onDateChange,
  onDragEnd,
  onProgressChange,
  showTooltips = true,
  showProgress = true,
  barStyle = 'rounded',
  rowHeight = 'default',
  timelineContainerRef,
}: TaskBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragGuidePosition, setDragGuidePosition] = useState<{ left: number; right: number } | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const originalStartDate = useRef(task.startDate);
  const originalEndDate = useRef(task.endDate);

  // Calculate position and width as percentages
  const taskStartDays = Math.max(0, Math.ceil((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
  const taskDurationDays = Math.max(1, Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const leftPosition = Math.max(0, Math.min(100, (taskStartDays / totalDays) * 100));
  const width = Math.max(2, Math.min(100 - leftPosition, (taskDurationDays / totalDays) * 100));

  // Convert pixel movement to days
  const pixelsToDays = useCallback((pixels: number) => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.parentElement?.clientWidth || containerRef.current.clientWidth || 1;
    const daysPerPixel = totalDays / containerWidth;
    return Math.round(pixels * daysPerPixel);
  }, [totalDays]);

  // Get clientX from mouse or touch event
  const getClientX = (e: MouseEvent | TouchEvent): number => {
    if ('touches' in e) {
      return e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
    }
    return e.clientX;
  };

  // Calculate guide positions for dragging
  const updateDragGuide = useCallback((startDate: Date, endDate: Date) => {
    const startDays = Math.max(0, Math.ceil((startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const endDays = Math.ceil((endDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    setDragGuidePosition({
      left: (startDays / totalDays) * 100,
      right: (endDays / totalDays) * 100,
    });
    setCurrentDuration(duration);
  }, [timelineStart, totalDays]);

  // Handle drag start for moving the entire bar
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isResizingLeft || isResizingRight) return;
    e.preventDefault();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    originalStartDate.current = new Date(task.startDate);
    originalEndDate.current = new Date(task.endDate);

    // Initialize drag guide
    updateDragGuide(task.startDate, task.endDate);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = getClientX(moveEvent);
      const deltaX = currentX - dragStartX.current;
      const deltaDays = pixelsToDays(deltaX);

      if (onDateChange) {
        const newStartDate = new Date(originalStartDate.current);
        newStartDate.setDate(newStartDate.getDate() + deltaDays);
        const newEndDate = new Date(originalEndDate.current);
        newEndDate.setDate(newEndDate.getDate() + deltaDays);

        onDateChange(task.id, newStartDate, newEndDate);
        updateDragGuide(newStartDate, newEndDate);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setDragGuidePosition(null);
      setCurrentDuration(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      if (onDragEnd) onDragEnd(task.id);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  // Handle resize from left edge (change start date)
  const handleResizeLeftStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingLeft(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    originalStartDate.current = new Date(task.startDate);

    // Initialize drag guide
    updateDragGuide(task.startDate, task.endDate);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = getClientX(moveEvent);
      const deltaX = currentX - dragStartX.current;
      const deltaDays = pixelsToDays(deltaX);

      if (onDateChange) {
        const newStartDate = new Date(originalStartDate.current);
        newStartDate.setDate(newStartDate.getDate() + deltaDays);

        // Don't allow start date to go past end date (minimum 1 day)
        const minDate = new Date(task.endDate);
        minDate.setDate(minDate.getDate() - 1);
        if (newStartDate < minDate) {
          onDateChange(task.id, newStartDate, task.endDate);
          updateDragGuide(newStartDate, task.endDate);
        }
      }
    };

    const handleEnd = () => {
      setIsResizingLeft(false);
      setDragGuidePosition(null);
      setCurrentDuration(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      if (onDragEnd) onDragEnd(task.id);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  // Handle resize from right edge (change end date)
  const handleResizeRightStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingRight(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    originalEndDate.current = new Date(task.endDate);

    // Initialize drag guide
    updateDragGuide(task.startDate, task.endDate);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = getClientX(moveEvent);
      const deltaX = currentX - dragStartX.current;
      const deltaDays = pixelsToDays(deltaX);

      if (onDateChange) {
        const newEndDate = new Date(originalEndDate.current);
        newEndDate.setDate(newEndDate.getDate() + deltaDays);

        // Don't allow end date to go before start date (minimum 1 day)
        const minDate = new Date(task.startDate);
        minDate.setDate(minDate.getDate() + 1);
        if (newEndDate > minDate) {
          onDateChange(task.id, task.startDate, newEndDate);
          updateDragGuide(task.startDate, newEndDate);
        }
      }
    };

    const handleEnd = () => {
      setIsResizingRight(false);
      setDragGuidePosition(null);
      setCurrentDuration(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      if (onDragEnd) onDragEnd(task.id);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  // Adjust height and styling for subtasks and row height setting
  const getBarHeight = () => {
    if (isSubtask) {
      return rowHeight === 'compact' ? 'h-6' : rowHeight === 'comfortable' ? 'h-9' : 'h-8';
    }
    return rowHeight === 'compact' ? 'h-7' : rowHeight === 'comfortable' ? 'h-10' : 'h-9';
  };

  const getContainerHeight = () => {
    // Use full height of parent row
    return 'h-full';
  };

  const getBarRadius = () => {
    if (barStyle === 'square') return 'rounded-sm';
    if (barStyle === 'pill') return 'rounded-full';
    return 'rounded';
  };

  const barHeight = getBarHeight();
  const containerHeight = getContainerHeight();
  const barRadius = getBarRadius();

  const isActive = isDragging || isResizingLeft || isResizingRight;

  // Calculate duration days for tooltip
  const durationDays = Math.max(1, Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Format dates for tooltip
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('ko', { month: 'short', day: 'numeric' });
  };

  // Compact tooltip content
  const tooltipContent = (
    <div className="space-y-2.5 text-popover-foreground min-w-[180px] p-1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: task.color }}
        />
        <span className="font-semibold text-sm text-foreground truncate">{task.name}</span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-medium">{formatDateShort(task.startDate)} → {formatDateShort(task.endDate)}</span>
          <span className="font-medium">{durationDays}일</span>
        </div>

        {task.assignee && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.assignee}</span>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2.5 pt-1.5">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${task.progress}%`, backgroundColor: task.color }}
            />
          </div>
          <span className="text-foreground font-semibold tabular-nums">{task.progress}%</span>
        </div>
      </div>
    </div>
  );

  // Handle progress click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isResizingLeft || isResizingRight || !onProgressChange) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.round((clickX / rect.width) * 100);
    const snappedProgress = Math.round(percentage / 10) * 10; // Snap to 10% increments
    const clampedProgress = Math.max(0, Math.min(100, snappedProgress));

    onProgressChange(task.id, clampedProgress);
  };

  // Generate clean, minimal bar style
  const getBarStyle = () => {
    const baseColor = task.color;
    return {
      left: `${leftPosition}%`,
      width: `${width}%`,
      minWidth: '32px',
      backgroundColor: baseColor,
      boxShadow: isActive
        ? `0 0 0 2px var(--background), 0 0 0 4px ${baseColor}`
        : isHovered
        ? `0 2px 8px ${baseColor}40, 0 1px 2px ${baseColor}30`
        : `0 1px 3px ${baseColor}20`,
    };
  };

  const taskBarElement = (
    <div
      className={`absolute ${barHeight} ${barRadius} task-bar group/bar ${
        isSubtask ? 'opacity-90' : ''
      } ${isActive ? 'z-30' : ''} ${onDateChange ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={getBarStyle()}
      role="slider"
      aria-label={`${task.name} progress control`}
      aria-valuenow={task.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${task.progress}% complete`}
      tabIndex={0}
      onMouseDown={onDateChange ? handleDragStart : undefined}
      onTouchStart={onDateChange ? handleDragStart : undefined}
      onClick={handleProgressClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress indicator - subtle dark overlay for incomplete portion */}
      {showProgress && task.progress < 100 && (
        <div className={`absolute inset-0 ${barRadius} overflow-hidden pointer-events-none`}>
          <div
            className="absolute inset-y-0 right-0 bg-black/25 progress-fill"
            style={{ width: `${100 - task.progress}%` }}
          />
        </div>
      )}

      {/* Completed checkmark only */}
      {showProgress && task.progress === 100 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="text-white w-3 h-3 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Milestone indicator */}
      {task.isMilestone && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Flag className="h-2 w-2 text-white" />
        </div>
      )}

      {/* Left Resize Handle */}
      {onDateChange && !task.isMilestone && (
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize z-30 touch-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
          style={{ left: '0px' }}
          onMouseDown={handleResizeLeftStart}
          onTouchStart={handleResizeLeftStart}
        >
          <div className="absolute inset-y-1 left-0.5 w-1 bg-white/80 rounded-full shadow-sm" />
        </div>
      )}

      {/* Right Resize Handle */}
      {onDateChange && !task.isMilestone && (
        <div
          className="absolute top-0 bottom-0 w-2 cursor-ew-resize z-30 touch-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
          style={{ right: '0px' }}
          onMouseDown={handleResizeRightStart}
          onTouchStart={handleResizeRightStart}
        >
          <div className="absolute inset-y-1 right-0.5 w-1 bg-white/80 rounded-full shadow-sm" />
        </div>
      )}
    </div>
  );

  // Calculate indentation for hierarchy (match task list indentation)
  const indentPx = level * 16;

  // Drag guide overlay - shows vertical lines at start and end positions
  const dragGuideOverlay = isActive && dragGuidePosition && (
    <>
      {/* Left vertical guide line */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none z-50"
        style={{
          left: `${dragGuidePosition.left}%`,
          background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.6) 10%, rgba(99, 102, 241, 0.6) 90%, transparent)',
        }}
      >
        {/* Dashed extension above */}
        <div
          className="absolute bottom-full left-0 w-px h-[200vh]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.4) 4px, transparent 4px, transparent 8px)',
          }}
        />
      </div>

      {/* Right vertical guide line */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none z-50"
        style={{
          left: `${dragGuidePosition.right}%`,
          background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.6) 10%, rgba(99, 102, 241, 0.6) 90%, transparent)',
        }}
      >
        {/* Dashed extension above */}
        <div
          className="absolute bottom-full left-0 w-px h-[200vh]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.4) 4px, transparent 4px, transparent 8px)',
          }}
        />
      </div>

      {/* Duration badge - floating above the bar */}
      {currentDuration && (
        <div
          className="absolute -top-7 transform -translate-x-1/2 z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: `${(dragGuidePosition.left + dragGuidePosition.right) / 2}%`,
          }}
        >
          <div className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap flex items-center gap-1">
            <span className="tabular-nums">{currentDuration}</span>
            <span className="text-indigo-200">일</span>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-indigo-600 rotate-45 shadow-lg" />
        </div>
      )}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${containerHeight} flex items-center`}
      style={{ paddingLeft: `${indentPx + 4}px`, paddingRight: '4px' }}
      role="listitem"
      aria-label={`Task: ${task.name}, Progress: ${task.progress}%`}
    >
      {/* Drag guide overlay */}
      {dragGuideOverlay}

      {/* Task Bar with optional tooltip */}
      {showTooltips && !isActive ? (
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            {taskBarElement}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      ) : (
        taskBarElement
      )}
    </div>
  );
}
