import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  className?: string;
}

export function AutoSaveIndicator({ status, lastSaved, className }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

    if (diff < 5) return '방금 저장됨';
    if (diff < 60) return `${diff}초 전 저장됨`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전 저장됨`;
    return lastSaved.toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs transition-all duration-300',
      status === 'error' ? 'text-red-500' : 'text-muted-foreground',
      className
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">저장 중...</span>
        </>
      )}
      {status === 'saved' && showSaved && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="hidden sm:inline text-green-500">저장됨</span>
        </>
      )}
      {status === 'idle' && lastSaved && (
        <>
          <Cloud className="h-3 w-3" />
          <span className="hidden sm:inline">{formatLastSaved()}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="h-3 w-3" />
          <span className="hidden sm:inline">저장 실패</span>
        </>
      )}
    </div>
  );
}

// Hook for managing auto-save status
export function useAutoSave() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const startSaving = () => setStatus('saving');

  const completeSave = () => {
    setStatus('saved');
    setLastSaved(new Date());
    // Reset to idle after animation
    setTimeout(() => setStatus('idle'), 2000);
  };

  const failSave = () => {
    setStatus('error');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return {
    status,
    lastSaved,
    startSaving,
    completeSave,
    failSave,
  };
}
