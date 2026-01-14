import styles from './ConfirmDialog.module.css'

export default function ConfirmDialog({
  title,
  onConfirm,
  onCancel,
}: {
  title?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          padding: '24px',
          background: '#fff',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title ?? '确认操作'}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          您确定要执行此操作吗？此操作可能无法撤销。
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onCancel}>取消</button>
          <button className={styles.primary} onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
