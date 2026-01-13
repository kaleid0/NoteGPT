import React from 'react'

export default function ConfirmDialog({ title, onConfirm, onCancel }: { title?: string; onConfirm: ()=>void; onCancel: ()=>void }) {
  return (
    <div role="dialog" aria-modal="true" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
      <h3>{title ?? 'Confirm'}</h3>
      <div style={{ marginTop: 8 }}>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    </div>
  )
}