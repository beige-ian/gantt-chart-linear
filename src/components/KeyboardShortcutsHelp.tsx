import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Keyboard } from 'lucide-react';
import { formatShortcut, SHORTCUT_KEYS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const shortcuts = [
    { ...SHORTCUT_KEYS.NEW_TASK, category: '태스크' },
    { ...SHORTCUT_KEYS.SEARCH, category: '탐색' },
    { ...SHORTCUT_KEYS.BOARD_VIEW, category: '뷰' },
    { ...SHORTCUT_KEYS.GANTT_VIEW, category: '뷰' },
    { ...SHORTCUT_KEYS.ANALYTICS_VIEW, category: '뷰' },
    { ...SHORTCUT_KEYS.TOGGLE_THEME, category: '설정' },
    { ...SHORTCUT_KEYS.EXPORT, category: '데이터' },
    { ...SHORTCUT_KEYS.IMPORT, category: '데이터' },
    { ...SHORTCUT_KEYS.HELP, category: '도움말' },
    { ...SHORTCUT_KEYS.ESCAPE, category: '일반' },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            키보드 단축키
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border text-xs">Ctrl</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border text-xs">/</kbd>
          {' 를 눌러 이 도움말을 언제든 볼 수 있습니다'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
