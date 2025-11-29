import React, { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Download, FileJson, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Sprint, SprintTask } from '../types/sprint';
import { Task } from './GanttChart';

interface DataExportProps {
  sprints: Sprint[];
  sprintTasks: SprintTask[];
  ganttTasks: Task[];
}

type ExportFormat = 'json' | 'csv' | 'markdown';
type DataType = 'all' | 'sprints' | 'tasks' | 'gantt';

export function DataExport({ sprints, sprintTasks, ganttTasks }: DataExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dataType, setDataType] = useState<DataType>('all');
  const [includeCompleted, setIncludeCompleted] = useState(true);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const generateJSON = () => {
    let data: any = {};

    if (dataType === 'all' || dataType === 'sprints') {
      data.sprints = sprints.filter(s => includeCompleted || s.status !== 'completed').map(s => ({
        ...s,
        startDate: formatDate(s.startDate),
        endDate: formatDate(s.endDate),
      }));
    }

    if (dataType === 'all' || dataType === 'tasks') {
      data.sprintTasks = sprintTasks.filter(t => includeCompleted || t.status !== 'done').map(t => ({
        ...t,
        startDate: formatDate(t.startDate),
        endDate: formatDate(t.endDate),
      }));
    }

    if (dataType === 'all' || dataType === 'gantt') {
      data.ganttTasks = ganttTasks.map(t => ({
        ...t,
        startDate: formatDate(t.startDate),
        endDate: formatDate(t.endDate),
      }));
    }

    return JSON.stringify(data, null, 2);
  };

  const generateCSV = () => {
    const rows: string[] = [];

    if (dataType === 'all' || dataType === 'tasks') {
      // Header
      rows.push('ID,Name,Status,Priority,Story Points,Sprint,Start Date,End Date,Progress,Assignee');

      // Data
      const filteredTasks = sprintTasks.filter(t => includeCompleted || t.status !== 'done');
      filteredTasks.forEach(task => {
        const sprint = sprints.find(s => s.id === task.sprintId);
        rows.push([
          task.id,
          `"${task.name.replace(/"/g, '""')}"`,
          task.status,
          task.priority,
          task.storyPoints || 0,
          sprint ? `"${sprint.name.replace(/"/g, '""')}"` : '',
          formatDate(task.startDate),
          formatDate(task.endDate),
          task.progress,
          task.assignee || '',
        ].join(','));
      });
    } else if (dataType === 'sprints') {
      rows.push('ID,Name,Status,Start Date,End Date,Capacity,Goal');
      const filteredSprints = sprints.filter(s => includeCompleted || s.status !== 'completed');
      filteredSprints.forEach(sprint => {
        rows.push([
          sprint.id,
          `"${sprint.name.replace(/"/g, '""')}"`,
          sprint.status,
          formatDate(sprint.startDate),
          formatDate(sprint.endDate),
          sprint.capacity || '',
          sprint.goal ? `"${sprint.goal.replace(/"/g, '""')}"` : '',
        ].join(','));
      });
    } else if (dataType === 'gantt') {
      rows.push('ID,Name,Start Date,End Date,Progress,Color,Parent ID');
      ganttTasks.forEach(task => {
        rows.push([
          task.id,
          `"${task.name.replace(/"/g, '""')}"`,
          formatDate(task.startDate),
          formatDate(task.endDate),
          task.progress,
          task.color,
          task.parentId || '',
        ].join(','));
      });
    }

    return rows.join('\n');
  };

  const generateMarkdown = () => {
    const lines: string[] = [];
    const today = new Date().toLocaleDateString('ko');

    lines.push(`# Sprint Manager Export`);
    lines.push(`> 내보내기 날짜: ${today}`);
    lines.push('');

    if (dataType === 'all' || dataType === 'sprints') {
      lines.push('## Sprints');
      lines.push('');
      const filteredSprints = sprints.filter(s => includeCompleted || s.status !== 'completed');
      filteredSprints.forEach(sprint => {
        const statusEmoji = sprint.status === 'completed' ? '✅' : sprint.status === 'active' ? '🔄' : '📋';
        lines.push(`### ${statusEmoji} ${sprint.name}`);
        lines.push(`- **상태**: ${sprint.status}`);
        lines.push(`- **기간**: ${formatDate(sprint.startDate)} ~ ${formatDate(sprint.endDate)}`);
        if (sprint.capacity) lines.push(`- **용량**: ${sprint.capacity} points`);
        if (sprint.goal) lines.push(`- **목표**: ${sprint.goal}`);
        lines.push('');
      });
    }

    if (dataType === 'all' || dataType === 'tasks') {
      lines.push('## Sprint Tasks');
      lines.push('');
      lines.push('| 태스크 | 상태 | 우선순위 | 포인트 | 진행률 | 담당자 |');
      lines.push('|--------|------|----------|--------|--------|--------|');

      const filteredTasks = sprintTasks.filter(t => includeCompleted || t.status !== 'done');
      filteredTasks.forEach(task => {
        const statusEmoji = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
        const priorityEmoji = task.priority === 'urgent' ? '🔴' : task.priority === 'high' ? '🟠' : task.priority === 'medium' ? '🟡' : '🟢';
        lines.push(`| ${statusEmoji} ${task.name} | ${task.status} | ${priorityEmoji} ${task.priority} | ${task.storyPoints || '-'} | ${task.progress}% | ${task.assignee || '-'} |`);
      });
      lines.push('');
    }

    if (dataType === 'all' || dataType === 'gantt') {
      lines.push('## Gantt Tasks');
      lines.push('');
      lines.push('| 태스크 | 시작일 | 종료일 | 진행률 |');
      lines.push('|--------|--------|--------|--------|');
      ganttTasks.forEach(task => {
        lines.push(`| ${task.name} | ${formatDate(task.startDate)} | ${formatDate(task.endDate)} | ${task.progress}% |`);
      });
      lines.push('');
    }

    // Statistics
    lines.push('## 통계');
    lines.push('');
    lines.push(`- 전체 스프린트: ${sprints.length}개`);
    lines.push(`- 전체 태스크: ${sprintTasks.length}개`);
    lines.push(`- 완료된 태스크: ${sprintTasks.filter(t => t.status === 'done').length}개`);
    lines.push(`- 전체 스토리 포인트: ${sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)}점`);
    lines.push(`- 완료된 스토리 포인트: ${sprintTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0)}점`);

    return lines.join('\n');
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = generateJSON();
        filename = `sprint-export-${formatDate(new Date())}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        content = generateCSV();
        filename = `sprint-export-${formatDate(new Date())}.csv`;
        mimeType = 'text/csv';
        break;
      case 'markdown':
        content = generateMarkdown();
        filename = `sprint-export-${formatDate(new Date())}.md`;
        mimeType = 'text/markdown';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('데이터 내보내기 완료', { description: filename });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">내보내기</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            데이터 내보내기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>내보내기 형식</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={format === 'json' ? 'default' : 'outline'}
                className="gap-2 h-12 flex-col"
                onClick={() => setFormat('json')}
              >
                <FileJson className="h-5 w-5" />
                <span className="text-xs">JSON</span>
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                className="gap-2 h-12 flex-col"
                onClick={() => setFormat('csv')}
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span className="text-xs">CSV</span>
              </Button>
              <Button
                variant={format === 'markdown' ? 'default' : 'outline'}
                className="gap-2 h-12 flex-col"
                onClick={() => setFormat('markdown')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Markdown</span>
              </Button>
            </div>
          </div>

          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label>데이터 종류</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 데이터</SelectItem>
                <SelectItem value="sprints">스프린트만</SelectItem>
                <SelectItem value="tasks">태스크만</SelectItem>
                <SelectItem value="gantt">간트 차트 태스크만</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>옵션</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-completed"
                checked={includeCompleted}
                onCheckedChange={(checked) => setIncludeCompleted(checked as boolean)}
              />
              <label htmlFor="include-completed" className="text-sm cursor-pointer">
                완료된 항목 포함
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="font-medium">내보내기 요약</div>
            <div className="text-muted-foreground">
              {dataType === 'all' && `${sprints.length}개 스프린트, ${sprintTasks.length}개 태스크, ${ganttTasks.length}개 간트 태스크`}
              {dataType === 'sprints' && `${sprints.filter(s => includeCompleted || s.status !== 'completed').length}개 스프린트`}
              {dataType === 'tasks' && `${sprintTasks.filter(t => includeCompleted || t.status !== 'done').length}개 태스크`}
              {dataType === 'gantt' && `${ganttTasks.length}개 간트 태스크`}
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="h-4 w-4" />
            내보내기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
