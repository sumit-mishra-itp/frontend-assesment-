import { useCheckoutUiStore } from '../store/useCheckoutUiStore';
import type { SortMode } from '../store/useCheckoutUiStore';

interface ProductControlsPanelProps {
  searchQuery: string;
  selectedCategory: string;
  sortMode: SortMode;
  categories: string[];
}

export const ProductControlsPanel = ({
  searchQuery,
  selectedCategory,
  sortMode,
  categories,
}: ProductControlsPanelProps) => {
  const setSearchQuery = useCheckoutUiStore((state) => state.setSearchQuery);
  const setSelectedCategory = useCheckoutUiStore(
    (state) => state.setSelectedCategory,
  );
  const setSortMode = useCheckoutUiStore((state) => state.setSortMode);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <label htmlFor="product-search" className="block text-sm font-semibold text-slate-900">
        Search products
      </label>
      <p className="mt-1 text-xs text-slate-600">
        Filtering is debounced by 300ms to reduce render churn for large lists.
      </p>
      <input
        id="product-search"
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by product title or category"
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-cyan-500 transition focus:ring-2"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          htmlFor="category-select"
        >
          Category view
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500 transition focus:ring-2"
          >
            {categories.map((category) => {
              return (
                <option key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </option>
              );
            })}
          </select>
        </label>

        <label
          className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          htmlFor="sort-select"
        >
          Sort
          <select
            id="sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500 transition focus:ring-2"
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="title-asc">Title: A to Z</option>
          </select>
        </label>
      </div>
    </section>
  );
};
