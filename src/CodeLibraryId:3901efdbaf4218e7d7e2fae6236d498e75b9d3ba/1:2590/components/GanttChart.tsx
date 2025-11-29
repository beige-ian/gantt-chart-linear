import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Calendar, MoreHorizontal, ChevronDown, ChevronRight, Edit3, Check, X } from 'lucide-react';
import { TaskBar } from './TaskBar';
import { TaskForm } from './TaskForm';
import { ExportMenu } from './ExportMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  dependencies?: string[];
  parentId?: string;
}

export interface GanttChartProps {
  className?: string;
}

export function GanttChart({ className }: GanttChartProps) {
  const [projectName, setProjectName] = useState('My Project Timeline');
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Project Planning',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      progress: 100,
      color: '#3b82f6',
    },
    {
      id: '2',
      name: 'Research & Analysis',
      startDate: new Date('2024-01-02'),
      endDate: new Date('2024-01-08'),
      progress: 100,
      color: '#06b6d4',
      parentId: '1',
    },
    {
      id: '3',
      name: 'Requirements Gathering',
      startDate: new Date('2024-01-09'),
      endDate: new Date('2024-01-15'),
      progress: 100,
      color: '#06b6d4',
      parentId: '1',
    },
    {
      id: '4',
      name: 'Design Phase',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-02-05'),
      progress: 75,
      color: '#10b981',
      dependencies: ['1'],
    },
    {
      id: '5',
      name: 'UI/UX Design',
      startDate: new Date('2024-01-12'),
      endDate: new Date('2024-01-25'),
      progress: 90,
      color: '#84cc16',
      parentId: '4',
    },
    {
      id: '6',
      name: 'System Architecture',
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-02-05'),
      progress: 60,
      color: '#84cc16',
      parentId: '4',
    },
    {
      id: '7',
      name: 'Development',
      startDate: new Date('2024-01-25'),
      endDate: new Date('2024-03-15'),
      progress: 40,
      color: '#f59e0b',
      dependencies: ['4'],
    },
    {
      id: '8',
      name: 'Testing',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-20'),
      progress: 0,
      color: '#ef4444',
      dependencies: ['7'],
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // Project name editing functions
  const handleStartEditingProjectName = () => {
    setTempProjectName(projectName);
    setIsEditingProjectName(true);
  };

  const handleSaveProjectName = () => {
    if (tempProjectName.trim()) {
      setProjectName(tempProjectName.trim());
    }
    setIsEditingProjectName(false);
  };

  const handleCancelEditingProjectName = () => {
    setTempProjectName(projectName);
    setIsEditingProjectName(false);
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveProjectName();
    } else if (e.key === 'Escape') {
      handleCancelEditingProjectName();
    }
  };

  // Helper functions for task hierarchy
  const getChildTasks = (parentId: string): Task[] => {
    return tasks.filter(task => task.parentId === parentId);
  };

  const getRootTasks = (): Task[] => {
    return tasks.filter(task => !task.parentId);
  };

  const hasChildren = (taskId: string): boolean => {
    return tasks.some(task => task.parentId === taskId);
  };

  const isTaskCollapsed = (taskId: string): boolean => {
    return collapsedTasks.has(taskId);
  };

  const toggleTaskCollapse = (taskId: string): void => {
    const newCollapsed = new Set(collapsedTasks);
    if (newCollapsed.has(taskId)) {
      newCollapsed.delete(taskId);
    } else {
      newCollapsed.add(taskId);
    }
    setCollapsedTasks(newCollapsed);
  };

  // Organize tasks hierarchically for display
  const organizeTasksHierarchically = (): Task[] => {
    const organized: Task[] = [];
    
    const addTaskAndChildren = (task: Task, level: number = 0) => {
      organized.push({ ...task, level } as Task & { level: number });
      
      if (!isTaskCollapsed(task.id)) {
        const children = getChildTasks(task.id);
        children.forEach(child => addTaskAndChildren(child, level + 1));
      }
    };

    getRootTasks().forEach(task => addTaskAndChildren(task));
    return organized;
  };

  // Calculate timeline bounds including all tasks
  const allTasks = tasks;
  const allDates = allTasks.flatMap(task => [task.startDate, task.endDate]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  // Extend timeline by 1 week on each side
  const timelineStart = new Date(minDate);
  timelineStart.setDate(timelineStart.getDate() - 7);
  const timelineEnd = new Date(maxDate);
  timelineEnd.setDate(timelineEnd.getDate() + 7);

  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  // Generate date headers
  const generateDateHeaders = () => {
    const headers = [];
    const currentDate = new Date(timelineStart);
    
    while (currentDate <= timelineEnd) {
      headers.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return headers;
  };

  const dateHeaders = generateDateHeaders();

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      parentId: addingSubtaskTo || taskData.parentId,
    };
    setTasks([...tasks, newTask]);
    setIsDialogOpen(false);
    setAddingSubtaskTo(null);
  };

  const handleEditTask = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...taskData, id: editingTask.id }
          : task
      ));
      setEditingTask(null);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    // Also delete all child tasks
    const taskIdsToDelete = new Set([taskId]);
    const findChildIds = (parentId: string) => {
      getChildTasks(parentId).forEach(child => {
        taskIdsToDelete.add(child.id);
        findChildIds(child.id);
      });
    };
    findChildIds(taskId);

    setTasks(tasks.filter(task => !taskIdsToDelete.has(task.id)));
    setEditingTask(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setAddingSubtaskTo(null);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingTask(null);
    setAddingSubtaskTo(null);
    setIsDialogOpen(true);
  };

  const openAddSubtaskDialog = (parentTaskId: string) => {
    setEditingTask(null);
    setAddingSubtaskTo(parentTaskId);
    setIsDialogOpen(true);
  };

  const organizedTasks = organizeTasksHierarchically();

  return (
    <div className={`w-full ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5" />
            {isEditingProjectName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempProjectName}
                  onChange={(e) => setTempProjectName(e.target.value)}
                  onKeyDown={handleProjectNameKeyDown}
                  onBlur={handleSaveProjectName}
                  className="text-xl font-semibold border-none p-0 h-auto bg-transparent focus:bg-background"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveProjectName}
                  className="h-6 w-6 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEditingProjectName}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-semibold">{projectName}</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEditingProjectName}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <ExportMenu tasks={tasks} projectName={projectName} />
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? 'Edit Task' : addingSubtaskTo ? 'Add Subtask' : 'Add New Task'}
                  </DialogTitle>
                </DialogHeader>
                <TaskForm
                  task={editingTask}
                  tasks={tasks}
                  parentTaskId={addingSubtaskTo}
                  onSubmit={editingTask ? handleEditTask : handleAddTask}
                  onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    setAddingSubtaskTo(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b border-border">
              <div className="w-64 p-3 border-r border-border bg-muted/50">
                <span className="font-medium">Task Name</span>
              </div>
              <div className="flex-1 flex">
                {dateHeaders.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 min-w-[40px] p-2 text-center text-sm border-r border-border bg-muted/30"
                  >
                    <div className="font-medium">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en', { month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            {organizedTasks.map((task) => {
              const taskWithLevel = task as Task & { level: number };
              const level = taskWithLevel.level || 0;
              const isParent = hasChildren(task.id);
              const isCollapsed = isTaskCollapsed(task.id);

              return (
                <div key={task.id} className="flex border-b border-border hover:bg-muted/20 group">
                  <div className="w-64 p-3 border-r border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 w-full">
                      {/* Indentation for hierarchy */}
                      <div style={{ width: `${level * 20}px` }} />
                      
                      {/* Collapse/Expand Button */}
                      {isParent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => toggleTaskCollapse(task.id)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {!isParent && <div className="w-4" />}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{task.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.progress}% complete
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(task)}>
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddSubtaskDialog(task.id)}>
                          Add Subtask
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex-1 relative">
                    <TaskBar
                      task={task}
                      timelineStart={timelineStart}
                      timelineEnd={timelineEnd}
                      totalDays={totalDays}
                      isSubtask={!!task.parentId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}