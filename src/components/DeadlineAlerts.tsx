import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Card } from './ui/card';
import { Bell, BellRing, AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { SprintTask } from '../types/sprint';
import { Sprint } from '../types/sprint';

interface DeadlineAlertsProps {
  tasks: SprintTask[];
  sprints: Sprint[];
}

interface Alert {
  id: string;
  type: 'overdue' | 'due_today' | 'due_soon' | 'sprint_ending';
  title: string;
  description: string;
  date: Date;
  taskId?: string;
  sprintId?: string;
  priority: 'high' | 'medium' | 'low';
}

export function DeadlineAlerts({ tasks, sprints }: DeadlineAlertsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const [lastCheckedAlertIds, setLastCheckedAlertIds] = useState<Set<string>>(() => {
    // Load from localStorage on initial render to prevent race condition
    const saved = localStorage.getItem('last-checked-alert-ids');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  const alerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const alerts: Alert[] = [];

    // Check task deadlines
    tasks.forEach(task => {
      if (task.status === 'done') return;

      const endDate = new Date(task.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        // Overdue
        alerts.push({
          id: `task-overdue-${task.id}`,
          type: 'overdue',
          title: task.name,
          description: `${Math.abs(daysUntilDue)}일 지남`,
          date: endDate,
          taskId: task.id,
          priority: 'high',
        });
      } else if (daysUntilDue === 0) {
        // Due today
        alerts.push({
          id: `task-today-${task.id}`,
          type: 'due_today',
          title: task.name,
          description: '오늘 마감',
          date: endDate,
          taskId: task.id,
          priority: 'high',
        });
      } else if (daysUntilDue <= 3) {
        // Due soon (within 3 days)
        alerts.push({
          id: `task-soon-${task.id}`,
          type: 'due_soon',
          title: task.name,
          description: `${daysUntilDue}일 후 마감`,
          date: endDate,
          taskId: task.id,
          priority: 'medium',
        });
      }
    });

    // Check sprint deadlines
    sprints.forEach(sprint => {
      if (sprint.status === 'completed') return;

      const endDate = new Date(sprint.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilEnd < 0 && sprint.status === 'active') {
        alerts.push({
          id: `sprint-overdue-${sprint.id}`,
          type: 'overdue',
          title: `스프린트: ${sprint.name}`,
          description: `${Math.abs(daysUntilEnd)}일 지남`,
          date: endDate,
          sprintId: sprint.id,
          priority: 'high',
        });
      } else if (daysUntilEnd === 0 && sprint.status === 'active') {
        alerts.push({
          id: `sprint-today-${sprint.id}`,
          type: 'due_today',
          title: `스프린트: ${sprint.name}`,
          description: '오늘 종료',
          date: endDate,
          sprintId: sprint.id,
          priority: 'high',
        });
      } else if (daysUntilEnd <= 2 && daysUntilEnd > 0 && sprint.status === 'active') {
        alerts.push({
          id: `sprint-ending-${sprint.id}`,
          type: 'sprint_ending',
          title: `스프린트: ${sprint.name}`,
          description: `${daysUntilEnd}일 후 종료`,
          date: endDate,
          sprintId: sprint.id,
          priority: 'medium',
        });
      }
    });

    // Sort by priority and date
    return alerts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.date.getTime() - b.date.getTime();
    });
  }, [tasks, sprints]);

  // Check for new alerts (only updates badge, no toasts)
  useEffect(() => {
    const newAlerts = alerts.filter(a => !lastCheckedAlertIds.has(a.id));
    if (newAlerts.length > 0 && lastCheckedAlertIds.size > 0) {
      setHasNewAlerts(true);
    }
  }, [alerts, lastCheckedAlertIds]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setHasNewAlerts(false);
      const alertIds = alerts.map(a => a.id);
      setLastCheckedAlertIds(new Set(alertIds));
      localStorage.setItem('last-checked-alert-ids', JSON.stringify(alertIds));
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'due_today':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'due_soon':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'sprint_ending':
        return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: Alert['type']) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
      case 'due_today':
        return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900';
      case 'due_soon':
        return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900';
      case 'sprint_ending':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
    }
  };

  const overdueCount = alerts.filter(a => a.type === 'overdue').length;
  const dueTodayCount = alerts.filter(a => a.type === 'due_today').length;
  const dueSoonCount = alerts.filter(a => a.type === 'due_soon' || a.type === 'sprint_ending').length;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 relative ${alerts.length > 0 ? 'border-orange-300 dark:border-orange-700' : ''}`}
        >
          {hasNewAlerts || alerts.some(a => a.type === 'overdue' || a.type === 'due_today') ? (
            <BellRing className="h-4 w-4 text-orange-500" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">알림</span>
          {alerts.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
              overdueCount > 0
                ? 'bg-red-500 text-white'
                : dueTodayCount > 0
                ? 'bg-orange-500 text-white'
                : 'bg-yellow-500 text-white'
            }`}>
              {alerts.length}
            </span>
          )}
          {hasNewAlerts && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            마감 알림
          </h3>
          {alerts.length > 0 && (
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              {overdueCount > 0 && (
                <span className="text-red-600">지연됨 {overdueCount}</span>
              )}
              {dueTodayCount > 0 && (
                <span className="text-orange-600">오늘 마감 {dueTodayCount}</span>
              )}
              {dueSoonCount > 0 && (
                <span className="text-yellow-600">곧 마감 {dueSoonCount}</span>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">마감 임박한 항목이 없습니다</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertBgColor(alert.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {alert.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        마감일: {alert.date.toLocaleDateString('ko')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
