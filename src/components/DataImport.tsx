import React, { useState, useRef } from 'react';
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
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sprint, SprintTask } from '../types/sprint';
import { Task } from './GanttChart';

interface DataImportProps {
  onImportSprints: (sprints: Sprint[]) => void;
  onImportSprintTasks: (tasks: SprintTask[]) => void;
  onImportGanttTasks: (tasks: Task[]) => void;
  existingSprints: Sprint[];
  existingSprintTasks: SprintTask[];
  existingGanttTasks: Task[];
}

type ImportFormat = 'json' | 'csv';
type ImportMode = 'replace' | 'merge';

interface ImportPreview {
  sprints: number;
  sprintTasks: number;
  ganttTasks: number;
  errors: string[];
}

export function DataImport({
  onImportSprints,
  onImportSprintTasks,
  onImportGanttTasks,
  existingSprints,
  existingSprintTasks,
  existingGanttTasks,
}: DataImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ImportFormat>('json');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setPreview(null);
    setFileContent(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseDate = (dateStr: string): Date => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`유효하지 않은 날짜: ${dateStr}`);
    }
    return date;
  };

  const parseJSON = (content: string): ImportPreview => {
    const errors: string[] = [];
    let sprintCount = 0;
    let taskCount = 0;
    let ganttCount = 0;

    try {
      const data = JSON.parse(content);

      if (data.sprints && Array.isArray(data.sprints)) {
        data.sprints.forEach((sprint: any, index: number) => {
          if (!sprint.id || !sprint.name) {
            errors.push(`스프린트 ${index + 1}: ID 또는 이름 누락`);
          } else {
            try {
              parseDate(sprint.startDate);
              parseDate(sprint.endDate);
              sprintCount++;
            } catch (e) {
              errors.push(`스프린트 "${sprint.name}": 날짜 형식 오류`);
            }
          }
        });
      }

      if (data.sprintTasks && Array.isArray(data.sprintTasks)) {
        data.sprintTasks.forEach((task: any, index: number) => {
          if (!task.id || !task.name) {
            errors.push(`태스크 ${index + 1}: ID 또는 이름 누락`);
          } else {
            try {
              parseDate(task.startDate);
              parseDate(task.endDate);
              taskCount++;
            } catch (e) {
              errors.push(`태스크 "${task.name}": 날짜 형식 오류`);
            }
          }
        });
      }

      if (data.ganttTasks && Array.isArray(data.ganttTasks)) {
        data.ganttTasks.forEach((task: any, index: number) => {
          if (!task.id || !task.name) {
            errors.push(`간트 태스크 ${index + 1}: ID 또는 이름 누락`);
          } else {
            try {
              parseDate(task.startDate);
              parseDate(task.endDate);
              ganttCount++;
            } catch (e) {
              errors.push(`간트 태스크 "${task.name}": 날짜 형식 오류`);
            }
          }
        });
      }

      if (sprintCount === 0 && taskCount === 0 && ganttCount === 0) {
        errors.push('가져올 수 있는 데이터가 없습니다');
      }

    } catch (e) {
      errors.push('JSON 파싱 오류: 올바른 JSON 형식이 아닙니다');
    }

    return {
      sprints: sprintCount,
      sprintTasks: taskCount,
      ganttTasks: ganttCount,
      errors,
    };
  };

  const parseCSV = (content: string): ImportPreview => {
    const errors: string[] = [];
    let taskCount = 0;

    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        errors.push('CSV에 헤더와 데이터가 필요합니다');
        return { sprints: 0, sprintTasks: 0, ganttTasks: 0, errors };
      }

      const header = lines[0].toLowerCase();

      // Detect CSV type
      if (header.includes('story points') || header.includes('sprint')) {
        // Sprint tasks CSV
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = parseCSVLine(line);
            if (parts.length >= 6) {
              taskCount++;
            } else {
              errors.push(`행 ${i + 1}: 필드 수 부족`);
            }
          }
        }
      } else if (header.includes('parent id') || header.includes('color')) {
        // Gantt tasks CSV
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = parseCSVLine(line);
            if (parts.length >= 5) {
              taskCount++;
            } else {
              errors.push(`행 ${i + 1}: 필드 수 부족`);
            }
          }
        }
      } else {
        errors.push('인식할 수 없는 CSV 형식입니다');
      }

    } catch (e) {
      errors.push('CSV 파싱 오류');
    }

    return {
      sprints: 0,
      sprintTasks: taskCount,
      ganttTasks: 0,
      errors,
    };
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      // Auto-detect format
      if (file.name.endsWith('.json')) {
        setFormat('json');
        setPreview(parseJSON(content));
      } else if (file.name.endsWith('.csv')) {
        setFormat('csv');
        setPreview(parseCSV(content));
      } else {
        // Try to auto-detect
        try {
          JSON.parse(content);
          setFormat('json');
          setPreview(parseJSON(content));
        } catch {
          setFormat('csv');
          setPreview(parseCSV(content));
        }
      }

      setIsLoading(false);
    };

    reader.onerror = () => {
      toast.error('파일을 읽을 수 없습니다');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileContent || !preview) return;

    setIsLoading(true);

    try {
      if (format === 'json') {
        const data = JSON.parse(fileContent);

        if (data.sprints && Array.isArray(data.sprints)) {
          const importedSprints: Sprint[] = data.sprints.map((s: any) => ({
            ...s,
            startDate: parseDate(s.startDate),
            endDate: parseDate(s.endDate),
          }));

          if (mode === 'replace') {
            onImportSprints(importedSprints);
          } else {
            // Merge: add only new items
            const existingIds = new Set(existingSprints.map(s => s.id));
            const newSprints = importedSprints.filter(s => !existingIds.has(s.id));
            onImportSprints([...existingSprints, ...newSprints]);
          }
        }

        if (data.sprintTasks && Array.isArray(data.sprintTasks)) {
          const importedTasks: SprintTask[] = data.sprintTasks.map((t: any) => ({
            ...t,
            startDate: parseDate(t.startDate),
            endDate: parseDate(t.endDate),
          }));

          if (mode === 'replace') {
            onImportSprintTasks(importedTasks);
          } else {
            const existingIds = new Set(existingSprintTasks.map(t => t.id));
            const newTasks = importedTasks.filter(t => !existingIds.has(t.id));
            onImportSprintTasks([...existingSprintTasks, ...newTasks]);
          }
        }

        if (data.ganttTasks && Array.isArray(data.ganttTasks)) {
          const importedGantt: Task[] = data.ganttTasks.map((t: any) => ({
            ...t,
            startDate: parseDate(t.startDate),
            endDate: parseDate(t.endDate),
          }));

          if (mode === 'replace') {
            onImportGanttTasks(importedGantt);
          } else {
            const existingIds = new Set(existingGanttTasks.map(t => t.id));
            const newTasks = importedGantt.filter(t => !existingIds.has(t.id));
            onImportGanttTasks([...existingGanttTasks, ...newTasks]);
          }
        }

        toast.success('데이터 가져오기 완료', {
          description: `스프린트 ${preview.sprints}개, 태스크 ${preview.sprintTasks}개`,
        });
      }

      setIsOpen(false);
      resetState();
    } catch (e) {
      toast.error('데이터 가져오기 실패', {
        description: '파일 형식을 확인해주세요',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">가져오기</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            데이터 가져오기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>파일 선택</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                fileName ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">파일 분석 중...</span>
                </div>
              ) : fileName ? (
                <div className="flex flex-col items-center gap-2">
                  {format === 'json' ? (
                    <FileJson className="h-8 w-8 text-primary" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  )}
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">클릭하여 다른 파일 선택</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    JSON 또는 CSV 파일을 선택하세요
                  </span>
                  <span className="text-xs text-muted-foreground">
                    클릭하거나 드래그 앤 드롭
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Import Mode */}
          <div className="space-y-2">
            <Label>가져오기 방식</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">병합 (기존 데이터 유지)</SelectItem>
                <SelectItem value="replace">대체 (기존 데이터 삭제)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'merge'
                ? '기존 데이터를 유지하고 새 데이터를 추가합니다 (동일 ID는 건너뜀)'
                : '기존 데이터를 모두 삭제하고 새 데이터로 대체합니다'}
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <Label>미리보기</Label>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>스프린트</span>
                  <span className="font-medium">{preview.sprints}개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>태스크</span>
                  <span className="font-medium">{preview.sprintTasks}개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>간트 태스크</span>
                  <span className="font-medium">{preview.ganttTasks}개</span>
                </div>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    주의사항
                  </div>
                  <ul className="text-xs text-destructive/80 space-y-1">
                    {preview.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {preview.errors.length > 5 && (
                      <li>... 외 {preview.errors.length - 5}개</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Success */}
              {preview.errors.length === 0 && (preview.sprints > 0 || preview.sprintTasks > 0 || preview.ganttTasks > 0) && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    가져올 준비가 되었습니다
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            className="w-full gap-2"
            disabled={!preview || preview.errors.length > 0 || isLoading ||
              (preview.sprints === 0 && preview.sprintTasks === 0 && preview.ganttTasks === 0)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            가져오기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
