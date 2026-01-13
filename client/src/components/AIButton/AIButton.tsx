import styles from './AIButton.module.css';

export default function AIButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      aria-label="Trigger AI"
      className={styles.aiButton}
    >
      <span className={styles.icon}>✨</span>
      AI 处理
    </button>
  );
}
