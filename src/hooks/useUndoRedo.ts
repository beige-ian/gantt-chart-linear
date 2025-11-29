import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions<T> {
  maxHistory?: number;
  isEqual?: (a: T, b: T) => boolean;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
) {
  const { maxHistory = 50, isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b) } = options;

  const [state, setStateInternal] = useState<T>(initialState);
  const history = useRef<T[]>([initialState]);
  const currentIndex = useRef(0);
  const isUndoRedo = useRef(false);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setStateInternal(prev => {
      const nextState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(prev)
        : newState;

      // Don't add to history if this is an undo/redo operation
      if (isUndoRedo.current) {
        isUndoRedo.current = false;
        return nextState;
      }

      // Don't add to history if state hasn't changed
      if (isEqual(prev, nextState)) {
        return nextState;
      }

      // Clear any redo history
      history.current = history.current.slice(0, currentIndex.current + 1);

      // Add new state to history
      history.current.push(nextState);

      // Limit history size
      if (history.current.length > maxHistory) {
        history.current = history.current.slice(-maxHistory);
      }

      currentIndex.current = history.current.length - 1;

      return nextState;
    });
  }, [maxHistory, isEqual]);

  const undo = useCallback(() => {
    if (currentIndex.current > 0) {
      currentIndex.current -= 1;
      isUndoRedo.current = true;
      setStateInternal(history.current[currentIndex.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (currentIndex.current < history.current.length - 1) {
      currentIndex.current += 1;
      isUndoRedo.current = true;
      setStateInternal(history.current[currentIndex.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = currentIndex.current > 0;
  const canRedo = currentIndex.current < history.current.length - 1;

  const clearHistory = useCallback(() => {
    history.current = [state];
    currentIndex.current = 0;
  }, [state]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
