import { useEffect, useState, useCallback, useMemo } from 'react'
import styles from './AIStreamModal.module.css'
import { useAIStream } from '../../hooks/useAIStream'
import { useStreamingMetrics, consoleReporter } from '../../hooks/useStreamingMetrics'
import { useGlobalToast } from '../Toast'
import { loadLLMConfig } from '../../lib/llmConfig'

type Props = {
  input: string
  onAccept: (result: string) => void
  onDiscard: () => void
}

export default function AIStreamModal({ input, onAccept, onDiscard }: Props) {
  const [text, setText] = useState('')
  const { start, stop, running } = useAIStream()
  const { error: showToastError } = useGlobalToast()

  const metricsOptions = useMemo(
    () => ({
      reporter: consoleReporter,
      debug: process.env.NODE_ENV === 'development',
    }),
    []
  )

  const { startTracking, recordDelta, completeTracking, errorTracking, resetMetrics } =
    useStreamingMetrics(metricsOptions)

  const handleStart = useCallback(() => {
    setText('')
    resetMetrics()
    startTracking()
    const cfg = loadLLMConfig()
    const promptTemplate = cfg.promptTemplate
    const finalInput = promptTemplate ? promptTemplate.replace(/{{\s*input\s*}}/g, input) : input

    start(
      finalInput,
      {
        onDelta: (d) => {
          setText((s) => s + d)
          recordDelta(d)
        },
        onComplete: () => {
          completeTracking()
        },
        onError: (e) => {
          setText((s) => s + `\n\n[Error] ${e.message}`)
          errorTracking(e)
          showToastError(`AI 处理失败: ${e.message}`, () => handleStart())
        },
      },
      {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        promptTemplate: cfg.promptTemplate,
      }
    )
  }, [
    input,
    start,
    startTracking,
    recordDelta,
    completeTracking,
    errorTracking,
    resetMetrics,
    showToastError,
  ])

  useEffect(() => {
    handleStart()
    return () => stop()
  }, [handleStart, stop])

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div className={styles.modal}>
        <h2 id="ai-modal-title" className={styles.title}>
          AI 智能助手
          {running && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 400,
                marginLeft: '12px',
                color: 'var(--text-muted)',
              }}
            >
              正在处理中...
            </span>
          )}
        </h2>
        <div className={`${styles.content} ${styles.aiStreamContent}`}>
          {text || (running ? '正在生成更智能的内容...' : '未获取到内容')}
        </div>
        <div className={styles.controls}>
          {!running && text.includes('[Error]') && (
            <button className={`${styles.retryBtn} ${styles.primary}`} onClick={handleStart}>
              重试
            </button>
          )}
          <button
            onClick={() => {
              stop()
              onDiscard()
            }}
          >
            取消
          </button>
          <button
            className={`${styles.acceptBtn} ${styles.primary}`}
            onClick={() => {
              stop()
              onAccept(text)
            }}
            disabled={running}
            style={
              running ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}
            }
          >
            采用
          </button>
        </div>
      </div>
    </div>
  )
}
