import type { OrderStateValue } from '../types';

interface OrderSummaryPanelProps {
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  currentState: OrderStateValue;
  checkoutLocked: boolean;
  isCartEmpty: boolean;
  onValidateCheckout: () => void;
  onReturnToCart: () => void;
  onSubmitOrder: () => void;
  onRetry: () => void;
  onRollback: () => void;
  onContinue: () => void;
  onReset: () => void;
}

export const OrderSummaryPanel = ({
  totals,
  currentState,
  checkoutLocked,
  isCartEmpty,
  onValidateCheckout,
  onReturnToCart,
  onSubmitOrder,
  onRetry,
  onRollback,
  onContinue,
  onReset,
}: OrderSummaryPanelProps) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
      <dl className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd>${totals.subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Tax (8.25%)</dt>
          <dd>${totals.tax.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Discount</dt>
          <dd>-${totals.discount.toFixed(2)}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <dt>Total</dt>
          <dd>${totals.grandTotal.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {currentState === 'CART_READY' && (
          <button
            type="button"
            onClick={onValidateCheckout}
            className="touch-target rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Validate checkout
          </button>
        )}

        {currentState === 'CHECKOUT_VALIDATED' && (
          <>
            <button
              type="button"
              onClick={onReturnToCart}
              className="touch-target rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Edit cart
            </button>
            <button
              type="button"
              disabled={checkoutLocked}
              onClick={onSubmitOrder}
              className="touch-target rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit order
            </button>
          </>
        )}

        {currentState === 'ORDER_SUBMITTED' && (
          <button
            type="button"
            disabled
            className="touch-target rounded-xl bg-amber-200 px-4 text-sm font-semibold text-amber-900"
          >
            Submitting... UI locked
          </button>
        )}

        {(currentState === 'ORDER_FAILED' ||
          currentState === 'ORDER_INCONSISTENT') && (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="touch-target rounded-xl bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-600"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onRollback}
              className="touch-target rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-50"
            >
              Rollback
            </button>
          </>
        )}

        {currentState === 'ROLLED_BACK' && (
          <button
            type="button"
            disabled={isCartEmpty}
            onClick={onContinue}
            className="touch-target rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        )}

        {currentState === 'ORDER_SUCCESS' && (
          <button
            type="button"
            onClick={onReset}
            className="touch-target rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Start new order
          </button>
        )}
      </div>
    </section>
  );
};
