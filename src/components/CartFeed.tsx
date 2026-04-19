import { Virtuoso } from 'react-virtuoso';
import type { CartItem } from '../types';

interface CartFeedProps {
  items: CartItem[];
  locked: boolean;
  onIncrement: (productId: number, quantity: number) => void;
  onDecrement: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

export const CartFeed = ({
  items,
  locked,
  onIncrement,
  onDecrement,
  onRemove,
}: CartFeedProps) => {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-cyan-900/10 backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">Cart</h2>
        <p className="mt-3 text-sm text-slate-600">Your cart is empty. Add products to begin checkout.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Cart</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm">
          {items.length} lines
        </span>
      </header>

      <Virtuoso
        className="h-[42vh] min-h-[240px]"
        totalCount={items.length}
        itemContent={(index) => {
          const item = items[index];

          return (
            <article className="m-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900 sm:text-base">
                  {item.title}
                </h3>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onRemove(item.productId)}
                  className="touch-target rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-600">
                Snapshot ${item.snapshotPrice.toFixed(2)} | Current ${item.livePrice.toFixed(2)}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onDecrement(item.productId, item.quantity - 1)}
                    className="touch-target rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-9 text-center text-sm font-semibold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onIncrement(item.productId, item.quantity + 1)}
                    className="touch-target rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-semibold text-emerald-700">
                  ${(item.livePrice * item.quantity).toFixed(2)}
                </p>
              </div>
            </article>
          );
        }}
      />
    </section>
  );
};
