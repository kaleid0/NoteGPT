import styles from './NoteList.module.css';
import { Link } from 'react-router-dom';

export type NoteItem = {
  id: string;
  title?: string;
  content: string;
};

export default function NoteList({ notes = [], onCreate }: { notes?: NoteItem[]; onCreate?: () => void }) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 style={{ fontSize: '1.25rem' }}>所有笔记</h2>
        <button className="primary" onClick={onCreate} aria-label="Create note">新建笔记</button>
      </div>
      {notes.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>暂无笔记</div>}
      <div className={styles.list}>
        {notes.map((n) => (
          <Link key={n.id} to={`/note/${n.id}`} className={styles.item}>
            <h3>{n.title || '无标题'}</h3>
            <p>{n.content || '暂无内容'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
