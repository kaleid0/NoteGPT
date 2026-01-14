import { create } from 'zustand'
import { ConnectionStatus } from '../hooks/useSync'

/**
 * 管理同步状态的 store
 */
interface SyncState {
  status: ConnectionStatus
  clientId: string
  lastRemoteUpdate: number
  lastUpdatedNoteId: string | null
  lastDeletedNoteId: string | null

  // setters
  setStatus: (s: ConnectionStatus) => void
  setClientId: (id: string) => void
  setLastRemoteUpdate: (ts: number) => void
  setLastUpdatedNoteId: (id: string | null) => void
  setLastDeletedNoteId: (id: string | null) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'disconnected',
  clientId: '',
  lastRemoteUpdate: 0,
  lastUpdatedNoteId: null,
  lastDeletedNoteId: null,

  setStatus: (s: ConnectionStatus) => set({ status: s }),
  setClientId: (id: string) => set({ clientId: id }),
  setLastRemoteUpdate: (ts: number) => set({ lastRemoteUpdate: ts }),
  setLastUpdatedNoteId: (id: string | null) => set({ lastUpdatedNoteId: id }),
  setLastDeletedNoteId: (id: string | null) => set({ lastDeletedNoteId: id }),
}))

export default useSyncStore
