import create from 'zustand';
import {
  Note,
  getAllNotes,
  upsertNote as dbUpsertNote,
  deleteNote as dbDeleteNote,
  Tag,
  Category,
  getAllTags,
  upsertTag as dbUpsertTag,
  deleteTag as dbDeleteTag,
  getAllCategories,
  upsertCategory as dbUpsertCategory,
  deleteCategory as dbDeleteCategory,
  getTagsForNote,
  getCategoriesForNote,
  getNotesByTag,
  getNotesByCategory,
  linkNoteTag as dbLinkNoteTag,
  unlinkNoteTag as dbUnlinkNoteTag,
  linkNoteCategory as dbLinkNoteCategory,
  unlinkNoteCategory as dbUnlinkNoteCategory,
} from '../lib/db/notes';

type NotesById = Record<string, Note>;
type TagsById = Record<string, Tag>;

interface NotesState {
  notesById: NotesById;
  noteIds: string[];
  tagsById: TagsById;
  tagIds: string[];
  categoriesById: TagsById;
  categoryIds: string[];
  noteTags: Record<string, string[]>; // noteId -> tagIds
  noteCategories: Record<string, string[]>; // noteId -> categoryIds

  // actions
  reload: () => Promise<void>;
  reloadTags: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  reloadRelations: () => Promise<void>;

  create: (note: Note) => Promise<Note>;
  upsert: (note: Note) => Promise<void>;
  remove: (id: string) => Promise<void>;

  // tags
  addTag: (tag: Tag) => Promise<void>;
  upsertTag: (tag: Tag) => Promise<void>;
  removeTag: (id: string) => Promise<void>;

  // categories
  addCategory: (category: Category) => Promise<void>;
  upsertCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  // relations
  linkNoteTag: (noteId: string, tagId: string) => Promise<void>;
  unlinkNoteTag: (noteId: string, tagId: string) => Promise<void>;
  linkNoteCategory: (noteId: string, categoryId: string) => Promise<void>;
  unlinkNoteCategory: (noteId: string, categoryId: string) => Promise<void>;

  // selectors
  getNotesByTag: (tagId: string) => Note[];
  getNotesByCategory: (categoryId: string) => Note[];
  getTagsForNote: (noteId: string) => Tag[];
  getCategoriesForNote: (noteId: string) => Category[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notesById: {},
  noteIds: [],
  tagsById: {},
  tagIds: [],
  categoriesById: {},
  categoryIds: [],
  noteTags: {},
  noteCategories: {},

  reload: async () => {
    const notes = await getAllNotes();
    const byId: NotesById = {};
    const ids: string[] = [];
    for (const n of notes) {
      byId[n.id] = n;
      ids.push(n.id);
    }
    set({ notesById: byId, noteIds: ids });
  },

  reloadTags: async () => {
    const tags = await getAllTags();
    const byId: TagsById = {};
    const ids: string[] = [];
    for (const t of tags) {
      byId[t.id] = t;
      ids.push(t.id);
    }
    set({ tagsById: byId, tagIds: ids });
  },

  reloadCategories: async () => {
    const categories = await getAllCategories();
    const byId: TagsById = {};
    const ids: string[] = [];
    for (const c of categories) {
      byId[c.id] = c;
      ids.push(c.id);
    }
    set({ categoriesById: byId, categoryIds: ids });
  },

  reloadRelations: async () => {
    const state = get();
    const noteTags: Record<string, string[]> = {};
    const noteCategories: Record<string, string[]> = {};

    for (const noteId of state.noteIds) {
      const tags = await getTagsForNote(noteId);
      noteTags[noteId] = tags.map((t) => t.id);

      const cats = await getCategoriesForNote(noteId);
      noteCategories[noteId] = cats.map((c) => c.id);
    }

    set({ noteTags, noteCategories });
  },

  create: async (note: Note) => {
    await dbUpsertNote(note);
    set((state) => ({
      notesById: { ...state.notesById, [note.id]: note },
      noteIds: state.noteIds.includes(note.id) ? state.noteIds : [note.id, ...state.noteIds],
    }));
    return note;
  },

  upsert: async (note: Note) => {
    await dbUpsertNote(note);
    set((state) => ({
      notesById: { ...state.notesById, [note.id]: note },
      noteIds: state.noteIds.includes(note.id) ? state.noteIds : [note.id, ...state.noteIds],
    }));
  },

  remove: async (id: string) => {
    await dbDeleteNote(id);
    set((state) => {
      const { [id]: _removed, ...rest } = state.notesById;
      const { [id]: _relRem, ...relRest } = state.noteTags;
      const { [id]: _catRem, ...catRest } = state.noteCategories;
      return {
        notesById: rest,
        noteIds: state.noteIds.filter((nid) => nid !== id),
        noteTags: relRest,
        noteCategories: catRest,
      };
    });
  },

  addTag: async (tag: Tag) => {
    await dbUpsertTag(tag);
    set((state) => ({
      tagsById: { ...state.tagsById, [tag.id]: tag },
      tagIds: state.tagIds.includes(tag.id) ? state.tagIds : [tag.id, ...state.tagIds],
    }));
  },

  upsertTag: async (tag: Tag) => {
    await dbUpsertTag(tag);
    set((state) => ({
      tagsById: { ...state.tagsById, [tag.id]: tag },
      tagIds: state.tagIds.includes(tag.id) ? state.tagIds : [tag.id, ...state.tagIds],
    }));
  },

  removeTag: async (id: string) => {
    await dbDeleteTag(id);
    set((state) => {
      const { [id]: _removed, ...rest } = state.tagsById;
      // Also remove from all note tag relations
      const updatedNoteTags = { ...state.noteTags };
      for (const noteId in updatedNoteTags) {
        updatedNoteTags[noteId] = updatedNoteTags[noteId].filter((tid) => tid !== id);
      }
      return {
        tagsById: rest,
        tagIds: state.tagIds.filter((tid) => tid !== id),
        noteTags: updatedNoteTags,
      };
    });
  },

  addCategory: async (category: Category) => {
    await dbUpsertCategory(category);
    set((state) => ({
      categoriesById: { ...state.categoriesById, [category.id]: category },
      categoryIds: state.categoryIds.includes(category.id) ? state.categoryIds : [category.id, ...state.categoryIds],
    }));
  },

  upsertCategory: async (category: Category) => {
    await dbUpsertCategory(category);
    set((state) => ({
      categoriesById: { ...state.categoriesById, [category.id]: category },
      categoryIds: state.categoryIds.includes(category.id) ? state.categoryIds : [category.id, ...state.categoryIds],
    }));
  },

  removeCategory: async (id: string) => {
    await dbDeleteCategory(id);
    set((state) => {
      const { [id]: _removed, ...rest } = state.categoriesById;
      // Also remove from all note category relations
      const updatedNoteCategories = { ...state.noteCategories };
      for (const noteId in updatedNoteCategories) {
        updatedNoteCategories[noteId] = updatedNoteCategories[noteId].filter((cid) => cid !== id);
      }
      return {
        categoriesById: rest,
        categoryIds: state.categoryIds.filter((cid) => cid !== id),
        noteCategories: updatedNoteCategories,
      };
    });
  },

  linkNoteTag: async (noteId: string, tagId: string) => {
    await dbLinkNoteTag(noteId, tagId);
    set((state) => {
      const current = state.noteTags[noteId] || [];
      if (current.includes(tagId)) return { noteTags: { ...state.noteTags } };
      return { noteTags: { ...state.noteTags, [noteId]: [tagId, ...current] } };
    });
  },

  unlinkNoteTag: async (noteId: string, tagId: string) => {
    await dbUnlinkNoteTag(noteId, tagId);
    set((state) => {
      const current = state.noteTags[noteId] || [];
      return { noteTags: { ...state.noteTags, [noteId]: current.filter((t) => t !== tagId) } };
    });
  },

  linkNoteCategory: async (noteId: string, categoryId: string) => {
    await dbLinkNoteCategory(noteId, categoryId);
    set((state) => {
      const current = state.noteCategories[noteId] || [];
      if (current.includes(categoryId)) return { noteCategories: { ...state.noteCategories } };
      return { noteCategories: { ...state.noteCategories, [noteId]: [categoryId, ...current] } };
    });
  },

  unlinkNoteCategory: async (noteId: string, categoryId: string) => {
    await dbUnlinkNoteCategory(noteId, categoryId);
    set((state) => {
      const current = state.noteCategories[noteId] || [];
      return { noteCategories: { ...state.noteCategories, [noteId]: current.filter((c) => c !== categoryId) } };
    });
  },

  getNotesByTag: (tagId: string) => {
    const state = get();
    const noteIds = Object.keys(state.noteTags).filter((nid) => (state.noteTags[nid] || []).includes(tagId));
    return noteIds.map((nid) => state.notesById[nid]).filter(Boolean);
  },

  getNotesByCategory: (categoryId: string) => {
    const state = get();
    const noteIds = Object.keys(state.noteCategories).filter((nid) => (state.noteCategories[nid] || []).includes(categoryId));
    return noteIds.map((nid) => state.notesById[nid]).filter(Boolean);
  },

  getTagsForNote: (noteId: string) => {
    const state = get();
    const tagIds = state.noteTags[noteId] || [];
    return tagIds.map((tid) => state.tagsById[tid]).filter(Boolean);
  },

  getCategoriesForNote: (noteId: string) => {
    const state = get();
    const categoryIds = state.noteCategories[noteId] || [];
    return categoryIds.map((cid) => state.categoriesById[cid]).filter(Boolean);
  },
}));

export default useNotesStore;
