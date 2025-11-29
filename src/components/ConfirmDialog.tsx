import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Archive className="h-5 w-5 text-blue-500" />;
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full transition-all duration-200 ${
              variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
              variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
              'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {getIcon()}
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${getButtonClass()}`}
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmDialogOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: UseConfirmDialogOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolver?.(true);
    setResolver(null);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolver?.(false);
    setResolver(null);
  }, [resolver]);

  const ConfirmDialogComponent = options ? (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      variant={options.variant}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, ConfirmDialogComponent };
}
