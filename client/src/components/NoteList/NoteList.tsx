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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>All Notes</h2>
        <button onClick={onCreate} aria-label="Create note">New Note</button>
      </div>
      {notes.length === 0 && <div>No notes yet</div>}
      {notes.map((n) => (
        <Link key={n.id} to={`/note/${n.id}`} className={styles.item}>
          <h3>{n.title ?? 'Untitled'}</h3>
          <p>{n.content.slice(0, 150)}</p>
        </Link>
      ))}
    </div>
  );
}
