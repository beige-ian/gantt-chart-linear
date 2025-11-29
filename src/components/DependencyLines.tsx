import React, { useMemo } from 'react';
import { Task } from './GanttChart';

interface DependencyLinesProps {
  tasks: (Task & { level?: number })[];
  timelineStart: Date;
  totalDays: number;
  rowHeight: 'compact' | 'default' | 'comfortable';
  showDependencyLines: boolean;
}

interface DependencyLine {
  fromTaskId: string;
  toTaskId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const rowHeightPx: Record<string, number> = {
  compact: 48,
  default: 64,
  comfortable: 80,
};

export function DependencyLines({
  tasks,
  timelineStart,
  totalDays,
  rowHeight,
  showDependencyLines,
}: DependencyLinesProps) {
  const lines = useMemo(() => {
    if (!showDependencyLines) return [];

    const dependencyLines: DependencyLine[] = [];
    const taskIndexMap = new Map<string, number>();
    const taskHeight = rowHeightPx[rowHeight] || 64;

    // Build task index map
    tasks.forEach((task, index) => {
      taskIndexMap.set(task.id, index);
    });

    tasks.forEach((task, toIndex) => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach((depId) => {
          const fromIndex = taskIndexMap.get(depId);
          if (fromIndex === undefined) return;

          const fromTask = tasks[fromIndex];
          if (!fromTask) return;

          // Calculate X positions based on task dates
          const fromEndDays = Math.ceil(
            (fromTask.endDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          const toStartDays = Math.ceil(
            (task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
          );

          const fromX = Math.max(0, Math.min(100, (fromEndDays / totalDays) * 100));
          const toX = Math.max(0, Math.min(100, (toStartDays / totalDays) * 100));

          // Calculate Y positions based on task row indices
          const fromY = fromIndex * taskHeight + taskHeight / 2;
          const toY = toIndex * taskHeight + taskHeight / 2;

          dependencyLines.push({
            fromTaskId: depId,
            toTaskId: task.id,
            fromX,
            fromY,
            toX,
            toY,
          });
        });
      }
    });

    return dependencyLines;
  }, [tasks, timelineStart, totalDays, rowHeight, showDependencyLines]);

  if (!showDependencyLines || lines.length === 0) return null;

  const containerHeight = tasks.length * (rowHeightPx[rowHeight] || 64);

  return (
    <svg
      className="absolute pointer-events-none z-20"
      style={{
        top: 0,
        left: '256px', // taskListWidth
        width: 'calc(100% - 256px)',
        height: containerHeight,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="dep-arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            className="text-blue-500"
          />
        </marker>
      </defs>

      {lines.map((line, index) => {
        // Create a curved path from end of source to start of target
        const midX = (line.fromX + line.toX) / 2;
        const verticalDistance = Math.abs(line.toY - line.fromY);
        const controlOffset = Math.max(5, verticalDistance * 0.3);

        const path = `
          M ${line.fromX}% ${line.fromY}
          C ${line.fromX + controlOffset / 10}% ${line.fromY},
            ${midX}% ${line.fromY},
            ${midX}% ${(line.fromY + line.toY) / 2}
          S ${line.toX - controlOffset / 10}% ${line.toY},
            ${line.toX}% ${line.toY}
        `;

        return (
          <g key={`${line.fromTaskId}-${line.toTaskId}-${index}`}>
            {/* Shadow path for better visibility */}
            <path
              d={path}
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeOpacity="0.3"
            />
            {/* Main path */}
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6,3"
              className="text-blue-400"
              markerEnd="url(#dep-arrowhead)"
            />
            {/* Source indicator circle */}
            <circle
              cx={`${line.fromX}%`}
              cy={line.fromY}
              r="4"
              fill="currentColor"
              className="text-blue-500"
            />
          </g>
        );
      })}
    </svg>
  );
}
