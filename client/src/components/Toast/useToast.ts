/**
 * useToast hook - 全局 Toast 状态管理
 */
import { useCallback, useState } from 'react';
import type { ToastItem, ToastType } from './Toast';

let toastIdCounter = 0;

export interface UseToastReturn {
  toasts: ToastItem[];
  addToast: (
    message: string,
    type?: ToastType,
    options?: { duration?: number; onRetry?: () => void }
  ) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  // 便捷方法
  success: (message: string, duration?: number) => string;
  error: (message: string, onRetry?: () => void, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: { duration?: number; onRetry?: () => void }
    ): string => {
      const id = `toast-${++toastIdCounter}`;
      const toast: ToastItem = {
        id,
        message,
        type,
        duration: options?.duration,
        onRetry: options?.onRetry,
      };
      setToasts((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 便捷方法
  const success = useCallback(
    (message: string, duration?: number) => addToast(message, 'success', { duration }),
    [addToast]
  );

  const error = useCallback(
    (message: string, onRetry?: () => void, duration?: number) =>
      addToast(message, 'error', { duration: duration ?? 0, onRetry }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => addToast(message, 'warning', { duration }),
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, 'info', { duration }),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
}

export default useToast;
