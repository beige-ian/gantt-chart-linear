import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';
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
    startDate: '',
    endDate: '',
    progress: 0,
    color: predefinedColors[0],
    parentId: '',
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

  const potentialParents = getPotentialParents();

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        startDate: task.startDate.toISOString().split('T')[0],
        endDate: task.endDate.toISOString().split('T')[0],
        progress: task.progress,
        color: task.color,
        parentId: task.parentId || '',
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
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        progress: 0,
        color: defaultColor,
        parentId: parentTaskId || '',
      });
    }
  }, [task, parentTaskId, tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
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
      startDate,
      endDate,
      progress: formData.progress,
      color: formData.color,
      parentId: formData.parentId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taskName">Task Name</Label>
        <Input
          id="taskName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter task name"
          required
        />
      </div>

      {/* Parent Task Selection */}
      {!parentTaskId && potentialParents.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="parentTask">Parent Task (Optional)</Label>
          <Select 
            value={formData.parentId} 
            onValueChange={(value) => setFormData({ ...formData, parentId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent task (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No parent (Root task)</SelectItem>
              {potentialParents.map((parentTask) => (
                <SelectItem key={parentTask.id} value={parentTask.id}>
                  {parentTask.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show parent task if adding subtask */}
      {parentTaskId && (
        <div className="space-y-2">
          <Label>Parent Task</Label>
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {tasks.find(t => t.id === parentTaskId)?.name}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Progress: {formData.progress}%</Label>
        <Slider
          value={[formData.progress]}
          onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-md border-2 transition-all ${
                formData.color === color 
                  ? 'border-foreground scale-110' 
                  : 'border-border hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {task ? 'Update Task' : parentTaskId ? 'Add Subtask' : 'Add Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}