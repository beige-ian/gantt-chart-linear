import React from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Download, FileText, Table, Printer } from 'lucide-react';
import { Task } from './GanttChart';

interface ExportMenuProps {
  tasks: Task[];
  projectName?: string;
}

export function ExportMenu({ tasks, projectName = 'Project Timeline' }: ExportMenuProps) {
  
  // Helper function to format date for CSV
  const formatDateForCSV = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to get task hierarchy level
  const getTaskLevel = (task: Task, allTasks: Task[]): number => {
    let level = 0;
    let currentParentId = task.parentId;
    
    while (currentParentId) {
      level++;
      const parent = allTasks.find(t => t.id === currentParentId);
      currentParentId = parent?.parentId;
    }
    
    return level;
  };

  // Helper function to organize tasks hierarchically for export
  const organizeTasksForExport = (): Task[] => {
    const organized: Task[] = [];
    
    const addTaskAndChildren = (task: Task) => {
      organized.push(task);
      const children = tasks.filter(t => t.parentId === task.id);
      children.forEach(child => addTaskAndChildren(child));
    };

    // Add root tasks first
    tasks.filter(task => !task.parentId).forEach(task => addTaskAndChildren(task));
    
    return organized;
  };

  const exportToJSON = () => {
    const exportData = {
      projectName,
      exportDate: new Date().toISOString(),
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        startDate: task.startDate.toISOString(),
        endDate: task.endDate.toISOString(),
        progress: task.progress,
        color: task.color,
        parentId: task.parentId || null,
        dependencies: task.dependencies || []
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_timeline.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const organizedTasks = organizeTasksForExport();
    
    // CSV Headers
    const headers = [
      'Task Name',
      'Level',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Progress (%)',
      'Color',
      'Parent Task',
      'Dependencies'
    ];

    // CSV Rows
    const rows = organizedTasks.map(task => {
      const level = getTaskLevel(task, tasks);
      const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId)?.name || '' : '';
      const dependencies = task.dependencies ? task.dependencies.map(depId => 
        tasks.find(t => t.id === depId)?.name || depId
      ).join('; ') : '';

      return [
        `"${'  '.repeat(level)}${task.name}"`,
        level.toString(),
        formatDateForCSV(task.startDate),
        formatDateForCSV(task.endDate),
        duration.toString(),
        task.progress.toString(),
        task.color,
        `"${parentTask}"`,
        `"${dependencies}"`
      ];
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_timeline.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPrint = () => {
    const organizedTasks = organizeTasksForExport();
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML for print
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} - Timeline</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 40px;
              line-height: 1.6;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .project-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .export-date {
              color: #666;
              font-size: 14px;
            }
            .task-list {
              margin-top: 20px;
            }
            .task-item {
              margin: 10px 0;
              padding: 10px;
              border-left: 4px solid;
              background: #f9f9f9;
              break-inside: avoid;
            }
            .task-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .task-details {
              font-size: 14px;
              color: #666;
            }
            .task-dates {
              margin: 5px 0;
            }
            .progress-bar {
              width: 100px;
              height: 8px;
              background: #eee;
              border-radius: 4px;
              margin: 5px 0;
              overflow: hidden;
            }
            .progress-fill {
              height: 100%;
              background: #4CAF50;
              transition: width 0.3s ease;
            }
            @media print {
              body { margin: 20px; }
              .task-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="project-title">${projectName}</h1>
            <div class="export-date">Exported on ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="task-list">
            ${organizedTasks.map(task => {
              const level = getTaskLevel(task, tasks);
              const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
              const indent = '&nbsp;&nbsp;'.repeat(level * 4);
              
              return `
                <div class="task-item" style="border-left-color: ${task.color}; margin-left: ${level * 20}px;">
                  <div class="task-name">${indent}${task.name}</div>
                  <div class="task-details">
                    <div class="task-dates">
                      <strong>Duration:</strong> ${formatDateForCSV(task.startDate)} to ${formatDateForCSV(task.endDate)} (${duration} days)
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span><strong>Progress:</strong> ${task.progress}%</span>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToJSON} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <Table className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToPrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Timeline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}