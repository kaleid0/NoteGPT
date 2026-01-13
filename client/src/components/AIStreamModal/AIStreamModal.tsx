import { useEffect, useState } from 'react';
import styles from './AIStreamModal.module.css';
import { useAIStream } from '../../hooks/useAIStream';

type Props = {
  input: string;
  onAccept: (result: string) => void;
  onDiscard: () => void;
};

export default function AIStreamModal({ input, onAccept, onDiscard }: Props) {
  const [text, setText] = useState('');
  const { start, stop, running } = useAIStream();

  useEffect(() => {
    start(input, {
      onDelta: (d) => setText((s) => s + d),
      onError: (e) => {
        setText((s) => s + `\n\n[Error] ${e.message}`);
      },
    });

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={`${styles.content} ai-stream-content`}>{text || (running ? 'Streaming...' : 'No content')}</div>
        <div className={styles.controls}>
          <button
            onClick={() => {
              stop();
              onDiscard();
            }}
          >
            丢弃
          </button>
          <button
            onClick={() => {
              stop();
              onAccept(text);
            }}
            disabled={running && text.length === 0}
          >
            接受
          </button>
        </div>
      </div>
    </div>
  );
}
