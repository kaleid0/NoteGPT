import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNote, Note } from '../lib/db/notes';
import NoteEditor from '../components/NoteEditor/NoteEditor';
import AIButton from '../components/AIButton/AIButton';
import AIStreamModal from '../components/AIStreamModal/AIStreamModal';
import { getSelectionInfo } from '../utils/selection';
import { useNotes } from '../hooks/useNotes';
import { useSyncContext } from '../context/SyncContext';

// 防抖延迟（毫秒）
const DEBOUNCE_DELAY = 500;

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const { replaceRange, update } = useNotes();
  const { syncUpdate, lastUpdatedNote, lastDeletedNoteId } = useSyncContext();
  
  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // 跟踪本地是否正在编辑（避免远程更新覆盖当前输入）
  const isEditingRef = useRef(false);
  const lastLocalUpdateRef = useRef(0);

  // 加载笔记
  const loadNote = useCallback(async () => {
    if (!id) return;
    const n = await getNote(id);
    if (!n) {
      navigate('/');
      return;
    }
    setNote(n);
  }, [id, navigate]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // 处理远程更新（仅当不在编辑状态时应用）
  useEffect(() => {
    if (!lastUpdatedNote || !id) return;
    
    // 只处理当前笔记的更新
    if (lastUpdatedNote.id !== id) return;
    
    // 如果本地正在编辑，或者本地更新比远程更新更新，则忽略
    if (isEditingRef.current) {
      console.log('Ignoring remote update while editing');
      return;
    }
    
    const localUpdateTime = lastLocalUpdateRef.current;
    const remoteUpdateTime = new Date(lastUpdatedNote.updatedAt).getTime();
    
    if (remoteUpdateTime > localUpdateTime) {
      console.log('Applying remote update to note:', lastUpdatedNote.id);
      setNote(lastUpdatedNote);
    }
  }, [lastUpdatedNote, id]);

  // 处理远程删除（当前笔记被删除时返回列表）
  useEffect(() => {
    if (lastDeletedNoteId && lastDeletedNoteId === id) {
      console.log('Current note was deleted remotely, navigating back');
      navigate('/');
    }
  }, [lastDeletedNoteId, id, navigate]);

  if (!note) return <div style={{ padding: 16 }}>Loading...</div>;

  function handleChange(content: string) {
    if (!note) return;
    
    isEditingRef.current = true;
    const updated: Note = { ...note, content, updatedAt: new Date().toISOString() };
    setNote(updated);
    
    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(async () => {
      await update(updated);
      await syncUpdate(updated);
      lastLocalUpdateRef.current = Date.now();
      isEditingRef.current = false;
    }, DEBOUNCE_DELAY);
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
        // reload note and sync
        const n = await getNote(note.id)
        if (n) {
          setNote(n)
          await syncUpdate(n)
        }
      } else {
        // fallback: replace entire content
        const updated = { ...note, content: newText, updatedAt: new Date().toISOString() }
        await update(updated)
        await syncUpdate(updated)
        setNote(updated)
      }
    } else if (note) {
      const updated = { ...note, content: newText, updatedAt: new Date().toISOString() }
      await update(updated)
      await syncUpdate(updated)
      setNote(updated)
    }

    setShowModal(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{note.title || 'Untitled'}</h1>
        <AIButton onClick={handleAIProcess} />
      </div>
      
      <NoteEditor content={note.content} onChange={handleChange} />

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
