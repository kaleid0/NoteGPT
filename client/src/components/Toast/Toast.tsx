/**
 * T046: Toast 错误友好提示与重试按钮
 */
import React, { useCallback, useEffect, useState } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /** Toast 消息内容 */
  message: string;
  /** Toast 类型 */
  type?: ToastType;
  /** 自动关闭时间（毫秒），0 表示不自动关闭 */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
  /** 重试回调（仅当类型为 error 时显示重试按钮） */
  onRetry?: () => void;
  /** 是否显示 */
  visible?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  onRetry,
  visible = true,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(visible);
    setIsExiting(false);
  }, [visible]);

  useEffect(() => {
    if (!isVisible || duration === 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // 等待退出动画
  }, [onClose]);

  const handleRetry = useCallback(() => {
    onRetry?.();
    handleClose();
  }, [onRetry, handleClose]);

  if (!isVisible) return null;

  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        {iconMap[type]}
      </span>
      <span className={styles.message}>{message}</span>
      <div className={styles.actions}>
        {type === 'error' && onRetry && (
          <button
            className={styles.retryButton}
            onClick={handleRetry}
            aria-label="重试"
          >
            重试
          </button>
        )}
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Toast 容器，用于管理多个 Toast
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onRetry?: () => void;
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
}) => {
  return (
    <div className={`${styles.container} ${styles[position]}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onRetry={toast.onRetry}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
