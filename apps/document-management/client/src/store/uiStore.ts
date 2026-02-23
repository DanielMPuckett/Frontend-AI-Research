import { create } from 'zustand';

interface UIState {
  selectedFolderId: number | null;
  selectedDocumentId: number | null;
  viewMode: 'list' | 'grid';
  searchQuery: string;
  selectedTag: string | null;
  isPanelOpen: boolean;
  setSelectedFolder: (id: number | null) => void;
  setSelectedDocument: (id: number | null) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSearchQuery: (q: string) => void;
  setSelectedTag: (tag: string | null) => void;
  openPanel: (documentId: number) => void;
  closePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedFolderId: undefined as unknown as null,
  selectedDocumentId: null,
  viewMode: 'list',
  searchQuery: '',
  selectedTag: null,
  isPanelOpen: false,

  setSelectedFolder: (id) =>
    set({ selectedFolderId: id, selectedTag: null, searchQuery: '', isPanelOpen: false, selectedDocumentId: null }),

  setSelectedDocument: (id) => set({ selectedDocumentId: id }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchQuery: (q) =>
    set({ searchQuery: q, selectedFolderId: undefined as unknown as null, selectedTag: null }),

  setSelectedTag: (tag) =>
    set({ selectedTag: tag, searchQuery: '', selectedFolderId: undefined as unknown as null, isPanelOpen: false, selectedDocumentId: null }),

  openPanel: (documentId) =>
    set({ isPanelOpen: true, selectedDocumentId: documentId }),

  closePanel: () =>
    set({ isPanelOpen: false, selectedDocumentId: null }),
}));
