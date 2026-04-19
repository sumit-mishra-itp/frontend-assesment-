import { Virtuoso } from 'react-virtuoso';
import type { Product } from '../types';

interface ProductFeedProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export const ProductFeed = ({ products, onAddProduct }: ProductFeedProps) => {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Product Feed</h2>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900 sm:text-sm">
          {products.length} items
        </span>
      </header>

      <Virtuoso
        className="min-h-[360px] flex-1 lg:min-h-[620px]"
        totalCount={products.length}
        itemContent={(index) => {
          const product = products[index];

          return (
            <article className="m-1 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
              <img
                src={product.image}
                alt={product.title}
                loading="lazy"
                className="h-16 w-16 flex-none rounded-xl border border-slate-200 bg-white object-contain p-1 sm:h-20 sm:w-20"
              />
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold text-slate-900 sm:text-base">
                  {product.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">{product.category}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-emerald-700 sm:text-base">
                    ${product.price.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddProduct(product)}
                    className="touch-target rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          );
        }}
      />
    </section>
  );
};
