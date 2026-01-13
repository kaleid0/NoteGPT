/**
 * T044: 流式度量与监控 Hook
 * 实现客户端对流式数据的度量与记录（首字符延迟）并上报到监控
 */
import { useCallback, useRef, useState } from 'react';

export interface StreamingMetrics {
  /** 首字符延迟（毫秒） */
  firstCharLatencyMs: number | null;
  /** 总传输时间（毫秒） */
  totalDurationMs: number | null;
  /** 接收的总字符数 */
  totalChars: number;
  /** 每秒字符速率 */
  charsPerSecond: number | null;
  /** 最后一次更新时间戳 */
  lastUpdatedAt: number | null;
  /** 是否已完成 */
  completed: boolean;
  /** 错误信息（如果有） */
  error: string | null;
}

export interface MetricsReporter {
  /**
   * 上报度量数据到监控系统
   * 可以是 Sentry, DataDog, Google Analytics 等
   */
  report: (metrics: StreamingMetrics, context?: Record<string, unknown>) => void;
}

export interface UseStreamingMetricsOptions {
  /** 可选的度量上报器 */
  reporter?: MetricsReporter;
  /** 是否在控制台输出度量（开发模式） */
  debug?: boolean;
  /** 自定义上下文信息 */
  context?: Record<string, unknown>;
}

const initialMetrics: StreamingMetrics = {
  firstCharLatencyMs: null,
  totalDurationMs: null,
  totalChars: 0,
  charsPerSecond: null,
  lastUpdatedAt: null,
  completed: false,
  error: null,
};

/**
 * 默认的控制台报告器（开发模式）
 */
export const consoleReporter: MetricsReporter = {
  report: (metrics, context) => {
    console.group('📊 Streaming Metrics');
    console.log('First Char Latency:', metrics.firstCharLatencyMs?.toFixed(2), 'ms');
    console.log('Total Duration:', metrics.totalDurationMs?.toFixed(2), 'ms');
    console.log('Total Chars:', metrics.totalChars);
    console.log('Chars/sec:', metrics.charsPerSecond?.toFixed(2));
    if (metrics.error) {
      console.error('Error:', metrics.error);
    }
    if (context) {
      console.log('Context:', context);
    }
    console.groupEnd();
  },
};

/**
 * 用于性能基线和监控的流式度量 Hook
 * 
 * @example
 * ```tsx
 * const { metrics, startTracking, recordDelta, completeTracking, errorTracking } = useStreamingMetrics({
 *   reporter: sentryReporter,
 *   debug: process.env.NODE_ENV === 'development',
 * });
 * 
 * // 在流式开始时
 * startTracking();
 * 
 * // 每收到一个 delta
 * recordDelta(delta);
 * 
 * // 流式完成时
 * completeTracking();
 * ```
 */
export function useStreamingMetrics(options: UseStreamingMetricsOptions = {}) {
  const { reporter, debug = false, context } = options;

  const [metrics, setMetrics] = useState<StreamingMetrics>(initialMetrics);
  const startTimeRef = useRef<number | null>(null);
  const firstCharTimeRef = useRef<number | null>(null);
  const totalCharsRef = useRef<number>(0);

  /**
   * 开始追踪流式响应
   */
  const startTracking = useCallback(() => {
    startTimeRef.current = performance.now();
    firstCharTimeRef.current = null;
    totalCharsRef.current = 0;

    setMetrics({
      ...initialMetrics,
      lastUpdatedAt: Date.now(),
    });

    if (debug) {
      console.log('🚀 Streaming started at:', new Date().toISOString());
    }
  }, [debug]);

  /**
   * 记录收到的 delta
   */
  const recordDelta = useCallback((delta: string) => {
    const now = performance.now();
    const startTime = startTimeRef.current;

    if (!startTime) {
      console.warn('recordDelta called before startTracking');
      return;
    }

    // 记录首字符延迟
    if (firstCharTimeRef.current === null) {
      firstCharTimeRef.current = now;
      const firstCharLatency = now - startTime;

      if (debug) {
        console.log('⚡ First char latency:', firstCharLatency.toFixed(2), 'ms');
      }
    }

    // 累计字符数
    totalCharsRef.current += delta.length;

    // 计算当前度量
    const firstCharLatencyMs = firstCharTimeRef.current
      ? firstCharTimeRef.current - startTime
      : null;
    const elapsedMs = now - startTime;
    const charsPerSecond =
      elapsedMs > 0 ? (totalCharsRef.current / elapsedMs) * 1000 : null;

    setMetrics((prev) => ({
      ...prev,
      firstCharLatencyMs,
      totalChars: totalCharsRef.current,
      charsPerSecond,
      lastUpdatedAt: Date.now(),
    }));
  }, [debug]);

  /**
   * 完成追踪并上报度量
   */
  const completeTracking = useCallback(() => {
    const now = performance.now();
    const startTime = startTimeRef.current;

    if (!startTime) {
      console.warn('completeTracking called before startTracking');
      return;
    }

    const totalDurationMs = now - startTime;
    const firstCharLatencyMs = firstCharTimeRef.current
      ? firstCharTimeRef.current - startTime
      : null;
    const charsPerSecond =
      totalDurationMs > 0
        ? (totalCharsRef.current / totalDurationMs) * 1000
        : null;

    const finalMetrics: StreamingMetrics = {
      firstCharLatencyMs,
      totalDurationMs,
      totalChars: totalCharsRef.current,
      charsPerSecond,
      lastUpdatedAt: Date.now(),
      completed: true,
      error: null,
    };

    setMetrics(finalMetrics);

    // 上报到监控系统
    if (reporter) {
      reporter.report(finalMetrics, context);
    }

    if (debug) {
      consoleReporter.report(finalMetrics, context);
    }

    return finalMetrics;
  }, [reporter, debug, context]);

  /**
   * 记录错误并上报
   */
  const errorTracking = useCallback((error: Error) => {
    const now = performance.now();
    const startTime = startTimeRef.current;
    const totalDurationMs = startTime ? now - startTime : null;
    const firstCharLatencyMs = firstCharTimeRef.current && startTime
      ? firstCharTimeRef.current - startTime
      : null;

    const errorMetrics: StreamingMetrics = {
      firstCharLatencyMs,
      totalDurationMs,
      totalChars: totalCharsRef.current,
      charsPerSecond: null,
      lastUpdatedAt: Date.now(),
      completed: false,
      error: error.message,
    };

    setMetrics(errorMetrics);

    // 上报错误
    if (reporter) {
      reporter.report(errorMetrics, { ...context, errorStack: error.stack });
    }

    if (debug) {
      console.error('❌ Streaming error:', error);
      consoleReporter.report(errorMetrics, context);
    }

    return errorMetrics;
  }, [reporter, debug, context]);

  /**
   * 重置度量状态
   */
  const resetMetrics = useCallback(() => {
    startTimeRef.current = null;
    firstCharTimeRef.current = null;
    totalCharsRef.current = 0;
    setMetrics(initialMetrics);
  }, []);

  return {
    metrics,
    startTracking,
    recordDelta,
    completeTracking,
    errorTracking,
    resetMetrics,
  };
}

/**
 * 创建一个简单的 Sentry 报告器（示例）
 */
export function createSentryReporter(): MetricsReporter {
  return {
    report: (metrics, context) => {
      // 这里可以集成 Sentry 或其他监控服务
      // 例如:
      // Sentry.addBreadcrumb({
      //   category: 'ai-streaming',
      //   message: 'Streaming metrics',
      //   data: { ...metrics, ...context },
      //   level: metrics.error ? 'error' : 'info',
      // });
      //
      // if (metrics.firstCharLatencyMs && metrics.firstCharLatencyMs > 3000) {
      //   Sentry.captureMessage('High AI latency detected', {
      //     level: 'warning',
      //     extra: { ...metrics, ...context },
      //   });
      // }

      // 对于演示，我们只记录到 localStorage
      try {
        const history = JSON.parse(
          localStorage.getItem('streaming_metrics_history') || '[]'
        );
        history.push({
          timestamp: new Date().toISOString(),
          metrics,
          context,
        });
        // 只保留最近 100 条记录
        if (history.length > 100) {
          history.shift();
        }
        localStorage.setItem('streaming_metrics_history', JSON.stringify(history));
      } catch {
        // localStorage 不可用时静默失败
      }
    },
  };
}
