import React, { useMemo } from 'react';
import { Card } from './ui/card';
import { Sprint, SprintTask } from '../types/sprint';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VelocityChartProps {
  sprints: Sprint[];
  tasks: SprintTask[];
}

interface SprintVelocity {
  sprintId: string;
  sprintName: string;
  plannedPoints: number;
  completedPoints: number;
  completionRate: number;
}

export function VelocityChart({ sprints, tasks }: VelocityChartProps) {
  const velocityData = useMemo(() => {
    // Only show completed and active sprints
    const relevantSprints = sprints
      .filter(s => s.status === 'completed' || s.status === 'active')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(-6); // Last 6 sprints

    const data: SprintVelocity[] = relevantSprints.map(sprint => {
      const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
      const plannedPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      const completedPoints = sprintTasks
        .filter(t => t.status === 'done')
        .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        plannedPoints,
        completedPoints,
        completionRate: plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0,
      };
    });

    return data;
  }, [sprints, tasks]);

  const stats = useMemo(() => {
    if (velocityData.length === 0) return null;

    const avgVelocity = Math.round(
      velocityData.reduce((acc, v) => acc + v.completedPoints, 0) / velocityData.length
    );
    const avgCompletionRate = Math.round(
      velocityData.reduce((acc, v) => acc + v.completionRate, 0) / velocityData.length
    );
    const maxVelocity = Math.max(...velocityData.map(v => v.completedPoints));
    const minVelocity = Math.min(...velocityData.map(v => v.completedPoints));

    // Trend calculation (last vs first half)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (velocityData.length >= 2) {
      const midPoint = Math.floor(velocityData.length / 2);
      const firstHalf = velocityData.slice(0, midPoint);
      const secondHalf = velocityData.slice(midPoint);

      const firstHalfAvg = firstHalf.reduce((acc, v) => acc + v.completedPoints, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((acc, v) => acc + v.completedPoints, 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up';
      else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down';
    }

    return { avgVelocity, avgCompletionRate, maxVelocity, minVelocity, trend };
  }, [velocityData]);

  if (velocityData.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">팀 벨로시티</h3>
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          완료된 스프린트가 없습니다
        </div>
      </Card>
    );
  }

  const maxPoints = Math.max(...velocityData.map(v => Math.max(v.plannedPoints, v.completedPoints)), 1);
  const chartHeight = 120;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">팀 벨로시티</h3>
        {stats && (
          <div className="flex items-center gap-1 text-sm">
            {stats.trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">상승</span>
              </>
            )}
            {stats.trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-red-500">하락</span>
              </>
            )}
            {stats.trend === 'stable' && (
              <>
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">안정</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight + 40 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full w-8 flex flex-col justify-between text-xs text-muted-foreground">
          <span>{maxPoints}</span>
          <span>{Math.round(maxPoints / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full">
          <div className="flex items-end gap-2 h-full pb-6">
            {velocityData.map((data, index) => {
              const plannedHeight = (data.plannedPoints / maxPoints) * chartHeight;
              const completedHeight = (data.completedPoints / maxPoints) * chartHeight;

              return (
                <div key={data.sprintId} className="flex-1 flex flex-col items-center">
                  <div className="relative flex items-end gap-1 h-full">
                    {/* Planned bar */}
                    <div
                      className="w-3 bg-gray-200 dark:bg-gray-700 rounded-t transition-all"
                      style={{ height: plannedHeight }}
                      title={`계획: ${data.plannedPoints}pts`}
                    />
                    {/* Completed bar */}
                    <div
                      className="w-3 bg-green-500 rounded-t transition-all"
                      style={{ height: completedHeight }}
                      title={`완료: ${data.completedPoints}pts`}
                    />
                  </div>
                  {/* Sprint label */}
                  <div className="mt-2 text-xs text-muted-foreground truncate max-w-[60px]" title={data.sprintName}>
                    {data.sprintName.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          <span>계획</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>완료</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.avgVelocity}</div>
            <div className="text-xs text-muted-foreground">평균 벨로시티</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.avgCompletionRate}%</div>
            <div className="text-xs text-muted-foreground">평균 완료율</div>
          </div>
        </div>
      )}
    </Card>
  );
}
