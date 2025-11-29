import React from 'react';
import { GanttChart } from './components/GanttChart';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground mt-2">
            Track your project timeline and task progress with an interactive Gantt chart
          </p>
        </div>
        
        <GanttChart />
      </div>
    </div>
  );
}