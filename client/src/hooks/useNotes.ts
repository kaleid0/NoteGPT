import { useCallback, useEffect, useState } from 'react';
import { getAllNotes, getNote, upsertNote, deleteNote, Note } from '../lib/db/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  const reload = useCallback(async () => {
    const all = await getAllNotes();
    setNotes(all);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(
    async (note: Note) => {
      await upsertNote(note);
      await reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteNote(id);
      await reload();
    },
    [reload]
  );

  const update = useCallback(
    async (note: Note) => {
      await upsertNote(note);
      await reload();
    },
    [reload]
  );

  const replaceRange = useCallback(
    async (id: string, start: number, end: number, replacement: string) => {
      const note = await getNote(id);
      if (!note) throw new Error('Note not found')
      const content = note.content || ''
      const updatedContent = content.substring(0, start) + replacement + content.substring(end)
      const updated: Note = { ...note, content: updatedContent, updatedAt: new Date().toISOString() }
      await upsertNote(updated)
      await reload()
      return updated
    },
    [reload]
  );

  return { notes, reload, create, remove, update, replaceRange };
}
