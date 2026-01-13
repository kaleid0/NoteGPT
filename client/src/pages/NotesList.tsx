import { useNavigate } from 'react-router-dom';
import NoteList from '../components/NoteList/NoteList';
import { Note } from '../lib/db/notes';
import { useNotes } from '../hooks/useNotes';

export default function NotesList() {
  const navigate = useNavigate();
  const { notes, create } = useNotes();

  async function handleCreate() {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: String(Date.now()),
      title: 'Untitled',
      content: '',
      createdAt: now,
      updatedAt: now
    };
    await create(newNote);
    navigate(`/note/${newNote.id}`);
  }

  return (
    <div>
      <NoteList notes={notes} onCreate={handleCreate} />
    </div>
  );
}
