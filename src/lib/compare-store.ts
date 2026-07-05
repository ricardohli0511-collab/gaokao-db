import { create } from 'zustand';

interface CompareItem {
  id: number;
  name: string;
  minScore?: number;
  province?: string;
  year?: number;
  subjectGroup?: string;
  batch?: string;
  examCategory?: string;
}

interface CompareStore {
  items: CompareItem[];
  addItem: (item: CompareItem) => void;
  removeItem: (id: number) => void;
  clearAll: () => void;
  isInList: (id: number) => boolean;
}

const MAX_ITEMS = 6;
const STORAGE_KEY = 'gaokao-db-compare';

function loadFromStorage(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (i: CompareItem) =>
        (i.province && i.year && i.subjectGroup && i.batch) ||
        i.examCategory
    );
    if (valid.length < parsed.length) {
      saveToStorage(valid);
    }
    return valid.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveToStorage(items: CompareItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  items: loadFromStorage(),

  addItem: (item: CompareItem) => {
    const { items } = get();
    if (items.length >= MAX_ITEMS) return;
    if (items.some((i) => i.id === item.id)) return;
    const next = [...items, item];
    saveToStorage(next);
    set({ items: next });
  },

  removeItem: (id: number) => {
    const next = get().items.filter((i) => i.id !== id);
    saveToStorage(next);
    set({ items: next });
  },

  clearAll: () => {
    saveToStorage([]);
    set({ items: [] });
  },

  isInList: (id: number) => {
    return get().items.some((i) => i.id === id);
  },
}));
