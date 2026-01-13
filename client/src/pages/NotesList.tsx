import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteList from '../components/NoteList/NoteList';
import { Note } from '../lib/db/notes';
import { useNotes } from '../hooks/useNotes';
import { useSyncContext } from '../context/SyncContext';

export default function NotesList() {
  const navigate = useNavigate();
  const { notes, reload } = useNotes();
  const { syncCreate, lastRemoteUpdate } = useSyncContext();

  // 当收到远程更新时刷新列表
  useEffect(() => {
    if (lastRemoteUpdate > 0) {
      reload();
    }
  }, [lastRemoteUpdate, reload]);

  async function handleCreate() {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: String(Date.now()),
      title: 'Untitled',
      content: '',
      createdAt: now,
      updatedAt: now
    };
    // 创建并同步到服务器
    await syncCreate(newNote);
    await reload();
    navigate(`/note/${newNote.id}`);
  }

  return (
    <div>
      <NoteList notes={notes} onCreate={handleCreate} />
    </div>
  );
}
