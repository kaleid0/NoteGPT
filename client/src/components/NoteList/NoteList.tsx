import { useState } from 'react'
import styles from './NoteList.module.css'
import { Link } from 'react-router-dom'
import { useSyncContext } from '../../context/SyncContext'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import { useGlobalToast } from '../Toast'

export type NoteItem = {
  id: string
  title?: string
  content: string
}

export default function NoteList({
  notes = [],
  onCreate,
}: {
  notes?: NoteItem[]
  onCreate?: () => void
}) {
  const { syncDelete } = useSyncContext()
  const { success: showToastSuccess, error: showToastError } = useGlobalToast()
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  async function confirmDelete() {
    if (!noteToDelete) return
    try {
      await syncDelete(noteToDelete)
      showToastSuccess?.('笔记已删除')
    } catch (e: unknown) {
      showToastError?.(`删除失败: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setNoteToDelete(null)
    }
  }

  function cancelDelete() {
    setNoteToDelete(null)
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 style={{ fontSize: '1.25rem' }}>所有笔记</h2>
        <button className={styles.primary} onClick={onCreate} aria-label="Create note">
          新建笔记
        </button>
      </div>
      {notes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          暂无笔记
        </div>
      )}
      <div className={styles.list}>
        {notes.map((n) => (
          <div key={n.id} className={styles.item} data-note-id={n.id}>
            <Link
              to={`/note/${n.id}`}
              style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
            >
              <h3>{n.title || '无标题'}</h3>
              <p>{n.content || '暂无内容'}</p>
            </Link>
            <div className={styles.itemActions}>
              <button
                aria-label={`Delete note ${n.id}`}
                className={styles.danger}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNoteToDelete(n.id)
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
      {noteToDelete && (
        <ConfirmDialog
          title="确认删除该笔记吗？"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  )
}
