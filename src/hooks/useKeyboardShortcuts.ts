import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
      const metaMatch = shortcut.meta ? event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcut keys for common actions
export const SHORTCUT_KEYS = {
  NEW_TASK: { key: 'n', ctrl: true, description: '새 태스크 생성' },
  SEARCH: { key: 'k', ctrl: true, description: '검색' },
  BOARD_VIEW: { key: '1', ctrl: true, description: '보드 뷰로 전환' },
  GANTT_VIEW: { key: '2', ctrl: true, description: '간트 뷰로 전환' },
  ANALYTICS_VIEW: { key: '3', ctrl: true, description: '분석 뷰로 전환' },
  TOGGLE_THEME: { key: 't', ctrl: true, shift: true, description: '테마 전환' },
  EXPORT: { key: 'e', ctrl: true, description: '데이터 내보내기' },
  IMPORT: { key: 'i', ctrl: true, description: '데이터 가져오기' },
  HELP: { key: '/', ctrl: true, description: '도움말 표시' },
  ESCAPE: { key: 'Escape', description: '닫기/취소' },
} as const;

// Format shortcut for display
export function formatShortcut(shortcut: { key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format special keys
  let keyDisplay = shortcut.key;
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  else if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  else if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  else if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  else if (shortcut.key === 'ArrowRight') keyDisplay = '→';
  else if (shortcut.key === 'Enter') keyDisplay = '↵';
  else if (shortcut.key === 'Backspace') keyDisplay = '⌫';
  else if (shortcut.key === '/') keyDisplay = '/';
  else keyDisplay = shortcut.key.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}
