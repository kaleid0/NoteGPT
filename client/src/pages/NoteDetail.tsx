import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNote, Note } from '../lib/db/notes';
import NoteEditor from '../components/NoteEditor/NoteEditor';
import AIButton from '../components/AIButton/AIButton';
import AIStreamModal from '../components/AIStreamModal/AIStreamModal';
import { getSelectionInfo } from '../utils/selection';
import { useNotes } from '../hooks/useNotes';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const { replaceRange, update } = useNotes();

  useEffect(() => {
    if (!id) return;
    getNote(id).then((n) => {
      if (!n) {
        // redirect to list
        navigate('/');
        return;
      }
      setNote(n);
    });
  }, [id, navigate]);

  if (!note) return <div style={{ padding: 16 }}>Loading...</div>;

  function handleChange(content: string) {
    if (!note) return;
    const updated: Note = { ...note, content, updatedAt: new Date().toISOString() };
    upsertNote(updated).then(() => setNote(updated));
  }

  // TODO AI 不可用（未设置API）时的处理
  function handleAIProcess() {
    if (!note) return;
    const sel = getSelectionInfo();
    const finalInput = sel.text || note.content;
    if (!finalInput.trim()) {
      alert('笔记为空，请先记录一些内容后再使用 AI 功能。');
      return;
    }
    setModalInput(sel.text || note.content);
    setShowModal(true);
  }

  async function acceptAI(newText: string) {
    // use replace API when selection present
    const sel = getSelectionInfo();
    if (sel.text && note) {
      // we assume textarea selection indices are correct
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        const start = textarea.selectionStart ?? 0
        const end = textarea.selectionEnd ?? 0
        await replaceRange(note.id, start, end, newText)
        // reload note
        const n = await getNote(note.id)
        setNote(n ?? null)
      } else {
        // fallback: replace entire content
        await update({ ...note, content: newText, updatedAt: new Date().toISOString() })
        setNote({ ...note, content: newText, updatedAt: new Date().toISOString() })
      }
    } else if (note) {
      await update({ ...note, content: newText, updatedAt: new Date().toISOString() })
      setNote({ ...note, content: newText, updatedAt: new Date().toISOString() })
    }

    setShowModal(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Note Detail</h1>
      <NoteEditor content={note.content} onChange={handleChange} />
      <div style={{ marginTop: 8 }}>
        <AIButton onClick={handleAIProcess} />
      </div>
      {showModal && (
        <AIStreamModal
          input={modalInput}
          onAccept={acceptAI}
          onDiscard={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
