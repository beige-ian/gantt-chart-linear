import React from 'react';
import { Task } from './GanttChart';

interface TaskBarProps {
  task: Task;
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  isSubtask?: boolean;
}

export function TaskBar({ task, timelineStart, timelineEnd, totalDays, isSubtask = false }: TaskBarProps) {
  // Calculate position and width as percentages
  const taskStartDays = Math.ceil((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const taskDurationDays = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const leftPosition = (taskStartDays / totalDays) * 100;
  const width = (taskDurationDays / totalDays) * 100;

  // Adjust height and styling for subtasks
  const barHeight = isSubtask ? 'h-6' : 'h-8';
  const containerHeight = isSubtask ? 'h-12' : 'h-16';

  return (
    <div className={`relative ${containerHeight} flex items-center p-2`}>
      {/* Task Bar */}
      <div
        className={`relative ${barHeight} rounded-md shadow-sm transition-all duration-200 hover:shadow-md ${
          isSubtask ? 'opacity-90' : ''
        }`}
        style={{
          left: `${leftPosition}%`,
          width: `${width}%`,
          backgroundColor: task.color,
          minWidth: '60px',
        }}
      >
        {/* Progress Bar */}
        <div
          className="h-full rounded-md bg-black/20 transition-all duration-300"
          style={{
            width: `${100 - task.progress}%`,
            marginLeft: `${task.progress}%`,
          }}
        />
        
        {/* Task Name Overlay */}
        <div className="absolute inset-0 flex items-center px-2">
          <span className={`text-white font-medium truncate ${isSubtask ? 'text-xs' : 'text-xs'}`}>
            {task.name}
          </span>
        </div>
        
        {/* Progress Indicator */}
        <div className={`absolute -top-1 -right-1 bg-background border border-border rounded-full flex items-center justify-center ${
          isSubtask ? 'w-4 h-4' : 'w-5 h-5'
        }`}>
          <span className={`font-medium ${isSubtask ? 'text-xs' : 'text-xs'}`}>
            {task.progress}%
          </span>
        </div>
      </div>

      {/* Dependency Lines */}
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="absolute top-0 left-0 pointer-events-none">
          {/* This would require more complex calculation for proper dependency lines */}
          <div className="w-2 h-2 bg-muted-foreground rounded-full" 
               style={{ left: `${leftPosition - 1}%`, top: '50%' }} />
        </div>
      )}

      {/* Subtask indicator line */}
      {isSubtask && (
        <div 
          className="absolute left-0 top-0 w-px bg-border"
          style={{ 
            height: '100%',
            left: `${leftPosition - 0.5}%`
          }}
        />
      )}
    </div>
  );
}