import { useMemo } from 'react';
import { CartFeed } from './components/CartFeed';
import { DevToolsPanel } from './components/DevToolsPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { LifecycleTimeline } from './components/LifecycleTimeline';
import { NotificationCenter } from './components/NotificationCenter';
import { OrderSummaryPanel } from './components/OrderSummaryPanel';
import { ProductControlsPanel } from './components/ProductControlsPanel';
import { ProductFeed } from './components/ProductFeed';
import { useCheckoutActions } from './hooks/useCheckoutActions';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useNotifications } from './hooks/useNotifications';
import { useOrderMachineController } from './hooks/useOrderMachineController';
import { useProductCatalog } from './hooks/useProductCatalog';
import { useCheckoutUiStore } from './store/useCheckoutUiStore';
import { normalizePrice } from './utils/hash';

const toReadableDate = (value: number): string => {
  return new Date(value).toLocaleString();
};

function App() {
  const searchQuery = useCheckoutUiStore((state) => state.searchQuery);
  const selectedCategory = useCheckoutUiStore((state) => state.selectedCategory);
  const sortMode = useCheckoutUiStore((state) => state.sortMode);
  const copiedAt = useCheckoutUiStore((state) => state.copiedAt);
  const setCopiedAt = useCheckoutUiStore((state) => state.setCopiedAt);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const {
    notifications,
    liveMessage,
    enqueueNotification,
    dismissNotification,
  } = useNotifications();

  const {
    snapshot,
    currentState,
    sendWithAudit,
    getCurrentCartVersion,
  } = useOrderMachineController(enqueueNotification);

  const {
    products,
    productsSource,
    loadingProducts,
    categories,
    productPriceById,
    filteredProducts,
  } = useProductCatalog({
    searchQuery: debouncedSearch,
    selectedCategory,
    sortMode,
    enqueueNotification,
  });

  const {
    checkoutLocked,
    isCartEmpty,
    handleValidateCheckout,
    handleSubmitOrder,
    handleRetry,
    handleCopyDiagnostics,
    handleRunDemoCommand,
  } = useCheckoutActions({
    currentState,
    context: snapshot.context,
    sendWithAudit,
    productPriceById,
    getCurrentCartVersion,
    enqueueNotification,
    setCopiedAt,
  });

  const totals = useMemo(() => {
    const subtotal = snapshot.context.cart.items.reduce((sum, item) => {
      return sum + item.livePrice * item.quantity;
    }, 0);
    const normalizedSubtotal = normalizePrice(subtotal);
    const tax = normalizePrice(normalizedSubtotal * 0.0825);
    const discountRate =
      normalizedSubtotal > 300 ? 0.07 : normalizedSubtotal > 150 ? 0.04 : 0;
    const discount = normalizePrice(normalizedSubtotal * discountRate);
    const grandTotal = normalizePrice(normalizedSubtotal + tax - discount);

    return {
      subtotal: normalizedSubtotal,
      tax,
      discount,
      grandTotal,
    };
  }, [snapshot.context.cart.items]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-sky-50 via-teal-50 to-orange-50 pb-12">
      <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[22rem] h-96 w-96 rounded-full bg-orange-300/40 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Secure Frontend Checkout
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            High-Performance Cart and Order Lifecycle
          </h1>
          <p className="mt-3 max-w-4xl text-sm text-slate-700 sm:text-base">
            XState-driven flow with tampering simulation, idempotency lock, cross-tab
            conflict handling, and persistent recovery for refresh-safe submission.
          </p>

          <div className="mt-4 grid gap-3 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <p className="rounded-xl bg-slate-100 p-3">
              <span className="block font-semibold uppercase tracking-wide text-slate-500">
                Data source
              </span>
              {loadingProducts
                ? 'Loading...'
                : productsSource === 'network'
                  ? 'Fake Store API'
                  : 'Cached products'}
            </p>
            <p className="rounded-xl bg-slate-100 p-3">
              <span className="block font-semibold uppercase tracking-wide text-slate-500">
                Replicated scale
              </span>
              {products.length} products
            </p>
            <p className="rounded-xl bg-slate-100 p-3">
              <span className="block font-semibold uppercase tracking-wide text-slate-500">
                Cart checksum
              </span>
              {snapshot.context.cart.checksum}
            </p>
            <p className="rounded-xl bg-slate-100 p-3">
              <span className="block font-semibold uppercase tracking-wide text-slate-500">
                Last cart update
              </span>
              {toReadableDate(snapshot.context.cart.updatedAt)}
            </p>
          </div>
        </header>

        <LifecycleTimeline currentState={currentState} />

        <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex min-h-full flex-col gap-6">
            <ProductControlsPanel
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              sortMode={sortMode}
              categories={categories}
            />

            <ProductFeed
              products={filteredProducts}
              onAddProduct={(product) => {
                sendWithAudit(
                  {
                    type: 'ADD_ITEM',
                    product,
                  },
                  {
                    productId: product.id,
                  },
                );
              }}
            />
          </div>

          <div className="space-y-6">
            <CartFeed
              items={snapshot.context.cart.items}
              locked={checkoutLocked || currentState !== 'CART_READY'}
              onIncrement={(productId, quantity) => {
                sendWithAudit({
                  type: 'UPDATE_QUANTITY',
                  productId,
                  quantity,
                });
              }}
              onDecrement={(productId, quantity) => {
                sendWithAudit({
                  type: 'UPDATE_QUANTITY',
                  productId,
                  quantity,
                });
              }}
              onRemove={(productId) => {
                sendWithAudit({
                  type: 'REMOVE_ITEM',
                  productId,
                });
              }}
            />

            <OrderSummaryPanel
              totals={totals}
              currentState={currentState}
              checkoutLocked={checkoutLocked}
              isCartEmpty={isCartEmpty}
              onValidateCheckout={handleValidateCheckout}
              onReturnToCart={() => sendWithAudit({ type: 'RETURN_TO_CART' })}
              onSubmitOrder={handleSubmitOrder}
              onRetry={handleRetry}
              onRollback={() => sendWithAudit({ type: 'ROLLBACK' })}
              onContinue={() => sendWithAudit({ type: 'CONTINUE' })}
              onReset={() => sendWithAudit({ type: 'RESET' })}
            />

            <NotificationCenter
              notifications={notifications}
              liveMessage={liveMessage}
              onDismiss={dismissNotification}
            />

            <DevToolsPanel onRunCommand={handleRunDemoCommand} />
          </div>
        </section>

        <DiagnosticsPanel
          idempotencyKey={snapshot.context.idempotencyKey}
          cartChecksum={snapshot.context.cart.checksum}
          cartVersion={snapshot.context.cart.version}
          transitionHistory={snapshot.context.transitionHistory}
          onCopyDiagnostics={handleCopyDiagnostics}
          copiedAt={copiedAt}
        />
      </div>
    </main>
  );
}

export default App;
