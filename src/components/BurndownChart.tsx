import React, { useMemo } from 'react';
import { Card } from './ui/card';
import { Sprint, SprintTask, BurndownDataPoint } from '../types/sprint';

interface BurndownChartProps {
  sprint: Sprint;
  tasks: SprintTask[];
}

export function BurndownChart({ sprint, tasks }: BurndownChartProps) {
  const chartData = useMemo(() => {
    const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
    const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const pointsPerDay = totalPoints / totalDays;

    const data: BurndownDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayIndex = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const idealRemaining = Math.max(0, totalPoints - (pointsPerDay * dayIndex));

      // Calculate actual remaining based on completed tasks up to this date
      let actualRemaining = totalPoints;
      if (currentDate <= today) {
        const completedPoints = sprintTasks
          .filter(t => t.status === 'done')
          .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

        // Simple linear interpolation for demo
        const progressRatio = dayIndex / totalDays;
        actualRemaining = totalPoints - (completedPoints * Math.min(1, progressRatio * 1.5));
      }

      data.push({
        date: new Date(currentDate),
        idealRemaining: Math.round(idealRemaining * 10) / 10,
        actualRemaining: currentDate <= today ? Math.round(actualRemaining * 10) / 10 : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { data, totalPoints, totalDays };
  }, [sprint, tasks]);

  const { data, totalPoints } = chartData;

  // Chart dimensions
  const width = 100;
  const height = 60;
  const padding = { top: 5, right: 5, bottom: 15, left: 25 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - (value / totalPoints) * chartHeight;

  // Generate path for ideal line
  const idealPath = data.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.idealRemaining);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Generate path for actual line (only up to today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const actualData = data.filter(d => d.date <= today);
  const actualPath = actualData.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.actualRemaining);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Y-axis labels
  const yLabels = [0, Math.round(totalPoints / 2), totalPoints];

  // X-axis labels (start, middle, end)
  const xLabels = [
    { index: 0, label: formatDate(data[0]?.date) },
    { index: Math.floor(data.length / 2), label: formatDate(data[Math.floor(data.length / 2)]?.date) },
    { index: data.length - 1, label: formatDate(data[data.length - 1]?.date) },
  ];

  function formatDate(date?: Date) {
    if (!date) return '';
    return date.toLocaleDateString('ko', { month: 'short', day: 'numeric' });
  }

  if (totalPoints === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Burndown Chart</h3>
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          No story points assigned yet
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Burndown Chart</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-400" />
            <span className="text-muted-foreground">Ideal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" />
            <span className="text-muted-foreground">Actual</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
          {/* Grid lines */}
          {yLabels.map((label) => (
            <line
              key={label}
              x1={padding.left}
              y1={yScale(label)}
              x2={width - padding.right}
              y2={yScale(label)}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="2,2"
            />
          ))}

          {/* Y-axis labels */}
          {yLabels.map((label) => (
            <text
              key={label}
              x={padding.left - 3}
              y={yScale(label)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: '3px' }}
            >
              {label}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ index, label }) => (
            <text
              key={index}
              x={xScale(index)}
              y={height - 3}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: '2.5px' }}
            >
              {label}
            </text>
          ))}

          {/* Ideal line */}
          <path
            d={idealPath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={0.5}
            strokeDasharray="2,1"
          />

          {/* Actual line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#22c55e"
              strokeWidth={0.8}
            />
          )}

          {/* Today marker */}
          {actualData.length > 0 && actualData.length < data.length && (
            <circle
              cx={xScale(actualData.length - 1)}
              cy={yScale(actualData[actualData.length - 1].actualRemaining)}
              r={1}
              fill="#22c55e"
            />
          )}
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <div className="text-lg font-bold">{totalPoints}</div>
          <div className="text-xs text-muted-foreground">Total Points</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">
            {tasks.filter(t => t.sprintId === sprint.id && t.status === 'done')
              .reduce((acc, t) => acc + (t.storyPoints || 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-600">
            {tasks.filter(t => t.sprintId === sprint.id && t.status !== 'done')
              .reduce((acc, t) => acc + (t.storyPoints || 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">Remaining</div>
        </div>
      </div>
    </Card>
  );
}
