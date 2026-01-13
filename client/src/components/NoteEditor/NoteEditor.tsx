import styles from './NoteEditor.module.css';

export default function NoteEditor({
  content = '',
  onChange,
}: {
  content?: string;
  onChange?: (s: string) => void;
}) {
  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Note editor"
      />
    </div>
  );
}
