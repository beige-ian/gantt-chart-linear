import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Trash2, Flag, Link2 } from 'lucide-react';
import { Task } from './GanttChart';

interface TaskFormProps {
  task?: Task | null;
  tasks: Task[];
  parentTaskId?: string | null;
  onSubmit: (taskData: Omit<Task, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const predefinedColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

export function TaskForm({ task, tasks, parentTaskId, onSubmit, onDelete, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    progress: 0,
    color: predefinedColors[0],
    parentId: '',
    isMilestone: false,
    dependencies: [] as string[],
  });

  // Get potential parent tasks (exclude current task and its descendants if editing)
  const getPotentialParents = (): Task[] => {
    const getDescendantIds = (taskId: string): string[] => {
      const descendants = tasks.filter(t => t.parentId === taskId);
      return descendants.reduce((acc, desc) => {
        return [...acc, desc.id, ...getDescendantIds(desc.id)];
      }, [] as string[]);
    };

    let excludeIds: string[] = [];
    if (task) {
      excludeIds = [task.id, ...getDescendantIds(task.id)];
    }

    return tasks.filter(t => !excludeIds.includes(t.id) && !t.parentId);
  };

  // Get potential dependencies (exclude current task, its children, and already dependent tasks)
  const getPotentialDependencies = (): Task[] => {
    if (!task) {
      return tasks.filter(t => !t.isMilestone);
    }

    const getDescendantIds = (taskId: string): string[] => {
      const descendants = tasks.filter(t => t.parentId === taskId);
      return descendants.reduce((acc, desc) => {
        return [...acc, desc.id, ...getDescendantIds(desc.id)];
      }, [] as string[]);
    };

    const excludeIds = [task.id, ...getDescendantIds(task.id)];
    return tasks.filter(t => !excludeIds.includes(t.id) && !t.isMilestone);
  };

  const potentialParents = getPotentialParents();
  const potentialDependencies = getPotentialDependencies();

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        startDate: task.startDate.toISOString().split('T')[0],
        endDate: task.endDate.toISOString().split('T')[0],
        progress: task.progress,
        color: task.color,
        parentId: task.parentId || '',
        isMilestone: task.isMilestone || false,
        dependencies: task.dependencies || [],
      });
    } else {
      // Set default dates for new tasks
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      // If adding a subtask, inherit parent's color and set dates within parent's range
      let defaultColor = predefinedColors[0];
      let defaultStartDate = today.toISOString().split('T')[0];
      let defaultEndDate = nextWeek.toISOString().split('T')[0];

      if (parentTaskId) {
        const parentTask = tasks.find(t => t.id === parentTaskId);
        if (parentTask) {
          defaultColor = parentTask.color;
          defaultStartDate = parentTask.startDate.toISOString().split('T')[0];
          defaultEndDate = parentTask.endDate.toISOString().split('T')[0];
        }
      }

      setFormData({
        name: '',
        description: '',
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        progress: 0,
        color: defaultColor,
        parentId: parentTaskId || '',
        isMilestone: false,
        dependencies: [],
      });
    }
  }, [task, parentTaskId, tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    const startDate = new Date(formData.startDate);
    let endDate = new Date(formData.endDate);

    // For milestones, end date equals start date
    if (formData.isMilestone) {
      endDate = new Date(startDate);
    }

    if (!formData.isMilestone && endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    // Validate subtask dates are within parent's range
    if (formData.parentId) {
      const parentTask = tasks.find(t => t.id === formData.parentId);
      if (parentTask) {
        if (startDate < parentTask.startDate || endDate > parentTask.endDate) {
          alert('Subtask dates must be within the parent task\'s date range');
          return;
        }
      }
    }

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      startDate,
      endDate,
      progress: formData.isMilestone ? (formData.progress === 100 ? 100 : 0) : formData.progress,
      color: formData.color,
      parentId: formData.parentId || undefined,
      isMilestone: formData.isMilestone || undefined,
      dependencies: formData.dependencies.length > 0 ? formData.dependencies : undefined,
    });
  };

  const toggleDependency = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.includes(taskId)
        ? prev.dependencies.filter(id => id !== taskId)
        : [...prev.dependencies, taskId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Task Type Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
        <div className="flex items-center gap-3">
          <Flag className={`h-5 w-5 ${formData.isMilestone ? 'text-primary' : 'text-muted-foreground'}`} />
          <Label htmlFor="milestone-toggle" className="text-[15px] font-semibold cursor-pointer">
            마일스톤
          </Label>
        </div>
        <Switch
          id="milestone-toggle"
          checked={formData.isMilestone}
          onCheckedChange={(checked) => setFormData({ ...formData, isMilestone: checked })}
        />
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="taskName" className="text-[15px] font-semibold">
          {formData.isMilestone ? '마일스톤 이름' : '태스크 이름'}
        </Label>
        <Input
          id="taskName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.isMilestone ? '예: Sprint 1 완료' : '예: 기능 개발'}
          required
          className="text-[15px] h-12"
        />
      </div>

      {/* Description */}
      <div className="space-y-2.5">
        <Label htmlFor="description" className="text-[15px] font-semibold">설명 (선택)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="태스크에 대한 설명을 입력하세요..."
          rows={2}
          className="text-[15px] min-h-[80px]"
        />
      </div>

      {/* Parent Task Selection */}
      {!parentTaskId && potentialParents.length > 0 && !formData.isMilestone && (
        <div className="space-y-2.5">
          <Label htmlFor="parentTask" className="text-[15px] font-semibold">상위 태스크 (선택)</Label>
          <Select
            value={formData.parentId}
            onValueChange={(value) => setFormData({ ...formData, parentId: value })}
          >
            <SelectTrigger className="h-12 text-[15px]">
              <SelectValue placeholder="상위 태스크 선택 (선택)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-[15px]">없음 (최상위 태스크)</SelectItem>
              {potentialParents.map((parentTask) => (
                <SelectItem key={parentTask.id} value={parentTask.id} className="text-[15px]">
                  {parentTask.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show parent task if adding subtask */}
      {parentTaskId && (
        <div className="space-y-2.5">
          <Label className="text-[15px] font-semibold">상위 태스크</Label>
          <div className="text-[15px] text-muted-foreground bg-muted/50 p-3.5 rounded-lg border border-border/50">
            {tasks.find(t => t.id === parentTaskId)?.name}
          </div>
        </div>
      )}

      {/* Date Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <Label htmlFor="startDate" className="text-[15px] font-semibold">
            {formData.isMilestone ? '마일스톤 날짜' : '시작일'}
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
            className="text-[15px] h-12"
          />
        </div>

        {!formData.isMilestone && (
          <div className="space-y-2.5">
            <Label htmlFor="endDate" className="text-[15px] font-semibold">종료일</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
              className="text-[15px] h-12"
            />
          </div>
        )}
      </div>

      {/* Progress - Only show for non-milestones */}
      {!formData.isMilestone && (
        <div className="space-y-3.5 p-4 bg-muted/30 rounded-xl border border-border/50">
          <Label className="text-[15px] font-semibold">
            진행률: <span className={`font-bold tabular-nums px-2 py-0.5 rounded-md ${
              formData.progress === 100 ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20' :
              formData.progress >= 50 ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20' :
              'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-500/20'
            }`}>{formData.progress}%</span>
          </Label>
          <Slider
            value={[formData.progress]}
            onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      )}

      {/* Milestone completion toggle */}
      {formData.isMilestone && (
        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
          <Label htmlFor="milestone-complete" className="text-[15px] font-semibold cursor-pointer">
            마일스톤 완료됨
          </Label>
          <Switch
            id="milestone-complete"
            checked={formData.progress === 100}
            onCheckedChange={(checked) => setFormData({ ...formData, progress: checked ? 100 : 0 })}
          />
        </div>
      )}

      {/* Dependencies */}
      {potentialDependencies.length > 0 && !formData.isMilestone && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            <Label className="text-[15px] font-semibold">의존성 (선행 태스크)</Label>
          </div>
          <div className="max-h-36 overflow-y-auto border border-border/50 rounded-xl p-3 space-y-2.5 bg-muted/20">
            {potentialDependencies.map((dep) => (
              <div key={dep.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`dep-${dep.id}`}
                  checked={formData.dependencies.includes(dep.id)}
                  onCheckedChange={() => toggleDependency(dep.id)}
                  className="h-5 w-5"
                />
                <label
                  htmlFor={`dep-${dep.id}`}
                  className="text-[14px] cursor-pointer flex-1 truncate leading-snug"
                >
                  {dep.name}
                </label>
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-border/30"
                  style={{ backgroundColor: dep.color }}
                />
              </div>
            ))}
          </div>
          {formData.dependencies.length > 0 && (
            <p className="text-[13px] text-muted-foreground font-medium">
              선택됨: {formData.dependencies.length}개의 선행 태스크
            </p>
          )}
        </div>
      )}

      {/* Color */}
      <div className="space-y-3.5">
        <Label className="text-[15px] font-semibold">색상</Label>
        <div className="flex gap-3 flex-wrap p-3 bg-muted/20 rounded-xl border border-border/50">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-11 h-11 rounded-xl border-2 transition-all shadow-sm ${
                formData.color === color
                  ? 'border-foreground scale-110 shadow-lg ring-2 ring-foreground/20'
                  : 'border-border/50 hover:scale-105 hover:shadow-md'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-border/50">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="gap-2 h-11 text-[15px]"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 text-[15px] px-5">
            취소
          </Button>
          <Button type="submit" className="h-11 text-[15px] px-5 font-semibold">
            {task ? '수정' : parentTaskId ? '서브태스크 추가' : formData.isMilestone ? '마일스톤 추가' : '태스크 추가'}
          </Button>
        </div>
      </div>
    </form>
  );
}
