import { useCallback, useEffect } from 'react';
import { Note } from '../lib/db/notes';
import useNotesStore from '../stores/notesStore';

/**
 * 笔记管理 Hook（本地 IndexedDB）
 * 注意：此 Hook 仅管理本地数据，同步逻辑请使用 SyncContext
 */
export function useNotes() {
  const notes = useNotesStore((s) => s.noteIds.map((id) => s.notesById[id]).filter(Boolean));
  const reload = useNotesStore((s) => s.reload);
  const create = useNotesStore((s) => s.create);
  const remove = useNotesStore((s) => s.remove);
  const update = useNotesStore((s) => s.upsert);
  const replaceRange = useCallback(
    async (id: string, start: number, end: number, replacement: string) => {
      const state = useNotesStore.getState();
      const note = state.notesById[id];
      if (!note) throw new Error('Note not found');
      const content = note.content || '';
      const updatedContent = content.substring(0, start) + replacement + content.substring(end);
      const updated: Note = {
        ...note,
        content: updatedContent,
        updatedAt: new Date().toISOString(),
      };
      await state.upsert(updated);
      return updated;
    },
    []
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { notes, reload, create, remove, update, replaceRange };
}
