import { create } from 'zustand';

export type SortMode = 'relevance' | 'price-asc' | 'price-desc' | 'title-asc';

interface CheckoutUiState {
  searchQuery: string;
  selectedCategory: string;
  sortMode: SortMode;
  copiedAt: string | null;
  setSearchQuery: (searchQuery: string) => void;
  setSelectedCategory: (selectedCategory: string) => void;
  setSortMode: (sortMode: SortMode) => void;
  setCopiedAt: (copiedAt: string | null) => void;
}

export const useCheckoutUiStore = create<CheckoutUiState>((set) => {
  return {
    searchQuery: '',
    selectedCategory: 'all',
    sortMode: 'relevance',
    copiedAt: null,
    setSearchQuery: (searchQuery) => {
      set({ searchQuery });
    },
    setSelectedCategory: (selectedCategory) => {
      set({ selectedCategory });
    },
    setSortMode: (sortMode) => {
      set({ sortMode });
    },
    setCopiedAt: (copiedAt) => {
      set({ copiedAt });
    },
  };
});
