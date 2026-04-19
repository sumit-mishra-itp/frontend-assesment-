import { assign, fromPromise, setup } from 'xstate';
import {
  addProductToCart,
  cartSubtotal,
  cloneCartSnapshot,
  createEmptyCart,
  recalculateCartSnapshot,
  removeProductFromCart,
  updateCartItemQuantity,
} from '../services/cart';
import { submitOrderToJsonPlaceholder } from '../services/orders';
import { logStructuredEvent } from '../services/observability';
import {
  generateIdempotencyKey,
  validateCartIntegrity,
} from '../services/security';
import { normalizePrice } from '../utils/hash';
import type {
  CartSnapshot,
  OrderMachineContext,
  OrderMachineEvent,
  OrderStateValue,
  PersistedMachineState,
  Product,
  TransitionHistoryEntry,
} from '../types';

const HISTORY_LIMIT = 120;

type SubmissionError = {
  kind: 'INCONSISTENT' | 'UPSTREAM_FAILURE';
  message: string;
};

const appendHistory = (
  history: TransitionHistoryEntry[],
  state: OrderStateValue,
  reason: string,
): TransitionHistoryEntry[] => {
  return [
    ...history,
    {
      state,
      at: new Date().toISOString(),
      reason,
    },
  ].slice(-HISTORY_LIMIT);
};

const normalizeCart = (cart: CartSnapshot): CartSnapshot => {
  return recalculateCartSnapshot(cart.items, cart.version);
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: string }).message);
  }

  return 'Unknown order submission failure';
};

const submitOrderActor = fromPromise(
  async ({ input }: { input: { context: OrderMachineContext } }) => {
    const { context } = input;
    const finalValidation = validateCartIntegrity(
      context.cart,
      'ORDER_SUBMITTED verification',
    );

    // The second integrity check blocks tampering introduced after checkout validation.
    if (!finalValidation.valid) {
      logStructuredEvent('security', 'order_submission_integrity_blocked', {
        reason: finalValidation.reason,
        tamperedLineIds: finalValidation.tamperedLineIds,
      });

      const inconsistentError: SubmissionError = {
        kind: 'INCONSISTENT',
        message: finalValidation.reason,
      };

      throw inconsistentError;
    }

    if (!context.idempotencyKey) {
      const inconsistentError: SubmissionError = {
        kind: 'INCONSISTENT',
        message: 'Missing idempotency key during order submission',
      };

      throw inconsistentError;
    }

    try {
      const orderReference = await submitOrderToJsonPlaceholder({
        idempotencyKey: context.idempotencyKey,
        checksum: context.cart.checksum,
        total: cartSubtotal(context.cart),
        items: context.cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.livePrice,
        })),
      });

      return {
        orderReference,
      };
    } catch (error) {
      const upstreamFailure: SubmissionError = {
        kind: 'UPSTREAM_FAILURE',
        message: getErrorMessage(error),
      };

      throw upstreamFailure;
    }
  },
);

const buildEntryActions = (state: OrderStateValue, reason: string) => {
  return [
    { type: 'trackStateEntry', params: { state, reason } },
    { type: 'emitTransitionLog', params: { state, reason } },
  ] as const;
};

export const createInitialContext = (seedCart?: CartSnapshot): OrderMachineContext => {
  const cart = seedCart ? normalizeCart(seedCart) : createEmptyCart();

  return {
    cart,
    lastValidCart: cloneCartSnapshot(cart),
    idempotencyKey: null,
    submissionLocked: false,
    errorMessage: null,
    orderReference: null,
    transitionHistory: [],
  };
};

export const normalizePersistedState = (
  persistedState: PersistedMachineState | null,
  fallbackCart: CartSnapshot,
): PersistedMachineState => {
  if (!persistedState) {
    return {
      state: 'CART_READY',
      context: createInitialContext(fallbackCart),
      updatedAt: Date.now(),
    };
  }

  const normalizedContext = {
    ...persistedState.context,
    cart: normalizeCart(persistedState.context.cart),
    lastValidCart: normalizeCart(persistedState.context.lastValidCart),
  };

  return {
    ...persistedState,
    context: normalizedContext,
  };
};

export const createOrderMachine = (persistedState: PersistedMachineState | null) => {
  const initialContext = persistedState?.context ?? createInitialContext();
  const initialState = persistedState?.state ?? 'CART_READY';

  return setup({
    types: {
      context: {} as OrderMachineContext,
      events: {} as OrderMachineEvent,
    },
    actors: {
      submitOrderActor,
    },
    guards: {
      canEnterCheckout: ({ context }) => {
        if (context.cart.items.length === 0) {
          return false;
        }

        const validation = validateCartIntegrity(
          context.cart,
          'CHECKOUT_VALIDATED precheck',
        );
        return validation.valid;
      },
      canSubmitOrder: ({ context }) => {
        return (
          context.cart.items.length > 0 &&
          !context.submissionLocked &&
          typeof context.idempotencyKey === 'string'
        );
      },
      canContinueAfterRollback: ({ context }) => {
        return context.cart.items.length > 0;
      },
      isInconsistentFailure: ({ event }) => {
        const candidateError = (event as { error?: SubmissionError }).error;
        return candidateError?.kind === 'INCONSISTENT';
      },
    },
    actions: {
      trackStateEntry: assign(({ context }, params: { state: OrderStateValue; reason: string }) => {
        return {
          transitionHistory: appendHistory(
            context.transitionHistory,
            params.state,
            params.reason,
          ),
        };
      }),
      emitTransitionLog: ({ context }, params: { state: OrderStateValue; reason: string }) => {
        logStructuredEvent('transition', 'state_entered', {
          state: params.state,
          reason: params.reason,
          cartItems: context.cart.items.length,
          cartVersion: context.cart.version,
          idempotencyKeyPresent: Boolean(context.idempotencyKey),
        });
      },
      addItemToCart: assign(({ context, event }) => {
        if (event.type !== 'ADD_ITEM') {
          return {};
        }

        return {
          cart: addProductToCart(context.cart, event.product as Product),
        };
      }),
      removeItemFromCart: assign(({ context, event }) => {
        if (event.type !== 'REMOVE_ITEM') {
          return {};
        }

        return {
          cart: removeProductFromCart(context.cart, event.productId),
        };
      }),
      updateItemQuantity: assign(({ context, event }) => {
        if (event.type !== 'UPDATE_QUANTITY') {
          return {};
        }

        return {
          cart: updateCartItemQuantity(context.cart, event.productId, event.quantity),
        };
      }),
      tamperCartPrice: assign(({ context, event }) => {
        if (event.type !== 'DEV_TAMPER_PRICE') {
          return {};
        }

        if (context.cart.items.length === 0) {
          return {};
        }

        const targetProductId = event.productId ?? context.cart.items[0].productId;
        const nextItems = context.cart.items.map((item) => {
          if (item.productId !== targetProductId) {
            return item;
          }

          return {
            ...item,
            livePrice: normalizePrice(Math.max(0.01, item.livePrice + event.delta)),
          };
        });

        logStructuredEvent('security', 'demo_tamper_price_applied', {
          targetProductId,
          delta: event.delta,
        });

        return {
          cart: {
            ...context.cart,
            items: nextItems,
            updatedAt: Date.now(),
          },
        };
      }),
      snapshotLastValidCart: assign(({ context }) => {
        return {
          lastValidCart: cloneCartSnapshot(context.cart),
        };
      }),
      assignIdempotencyKey: assign(() => {
        return {
          idempotencyKey: generateIdempotencyKey(),
        };
      }),
      clearIdempotencyKey: assign(() => {
        return {
          idempotencyKey: null,
        };
      }),
      lockSubmission: assign(() => {
        return {
          submissionLocked: true,
        };
      }),
      releaseSubmissionLock: assign(() => {
        return {
          submissionLocked: false,
        };
      }),
      clearError: assign(() => {
        return {
          errorMessage: null,
        };
      }),
      captureValidationError: assign(({ context }) => {
        if (context.cart.items.length === 0) {
          logStructuredEvent('security', 'checkout_validation_blocked', {
            reason: 'empty_cart',
          });

          return {
            errorMessage: 'Cannot continue with an empty cart.',
            submissionLocked: false,
          };
        }

        const validation = validateCartIntegrity(
          context.cart,
          'CHECKOUT_VALIDATED precheck',
        );

        logStructuredEvent('security', 'checkout_validation_blocked', {
          reason: validation.reason,
          tamperedLineIds: validation.tamperedLineIds,
          checksumValid: validation.checksumValid,
        });

        return {
          errorMessage: validation.reason,
          submissionLocked: false,
        };
      }),
      captureConflict: assign(({ context, event }) => {
        if (event.type !== 'CART_CONFLICT') {
          return {};
        }

        logStructuredEvent('security', 'cross_tab_conflict_detected', {
          localVersion: context.cart.version,
          remoteVersion: event.remoteVersion,
          reason: event.reason,
        });

        return {
          errorMessage: `Cart conflict detected: ${event.reason}`,
          submissionLocked: false,
        };
      }),
      captureSubmissionError: assign(({ event }) => {
        const submissionError = (event as { error?: SubmissionError }).error;
        const message = submissionError?.message ?? 'Order submission failed.';

        logStructuredEvent('system', 'order_submission_failed', {
          kind: submissionError?.kind ?? 'UNKNOWN',
          message,
        });

        return {
          errorMessage: message,
          submissionLocked: false,
        };
      }),
      captureSubmitBlocked: assign(({ context }) => {
        const reason =
          context.submissionLocked || context.idempotencyKey === null
            ? 'Retry blocked by idempotency lock. Wait for current submission to finish.'
            : 'Submit blocked because cart is empty.';

        logStructuredEvent('security', 'submit_blocked', {
          reason,
          submissionLocked: context.submissionLocked,
          hasIdempotencyKey: Boolean(context.idempotencyKey),
          cartItems: context.cart.items.length,
        });

        return {
          errorMessage: reason,
        };
      }),
      captureContinueBlocked: assign(() => {
        const reason = 'Continue blocked because the cart is empty after rollback.';

        logStructuredEvent('system', 'continue_blocked', {
          reason,
        });

        return {
          errorMessage: reason,
        };
      }),
      capturePersistenceFailure: assign(({ event }) => {
        if (event.type !== 'PERSISTENCE_FAILURE') {
          return {};
        }

        const reason = `Persistence failure detected: ${event.reason}`;

        logStructuredEvent('system', 'persistence_failure_detected', {
          reason: event.reason,
        });

        return {
          errorMessage: reason,
          submissionLocked: false,
        };
      }),
      storeOrderReference: assign(({ event }) => {
        const doneEvent = event as { output?: { orderReference: number } };

        if (
          !doneEvent.output ||
          typeof doneEvent.output.orderReference !== 'number'
        ) {
          return {};
        }

        return {
          orderReference: doneEvent.output.orderReference,
          idempotencyKey: null,
          submissionLocked: false,
          errorMessage: null,
        };
      }),
      rollbackCart: assign(({ context }) => {
        const restoredCart = cloneCartSnapshot(context.lastValidCart);

        logStructuredEvent('system', 'rollback_applied', {
          restoredVersion: restoredCart.version,
          restoredItems: restoredCart.items.length,
        });

        return {
          cart: restoredCart,
          orderReference: null,
        };
      }),
      resetForNextOrder: assign(() => {
        const freshCart = createEmptyCart();

        return {
          cart: freshCart,
          lastValidCart: cloneCartSnapshot(freshCart),
          idempotencyKey: null,
          submissionLocked: false,
          errorMessage: null,
          orderReference: null,
        };
      }),
    },
  }).createMachine({
    id: 'orderLifecycle',
    initial: initialState,
    context: initialContext,
    on: {
      PERSISTENCE_FAILURE: {
        target: '.ORDER_INCONSISTENT',
        actions: 'capturePersistenceFailure',
      },
    },
    states: {
      CART_READY: {
        entry: buildEntryActions('CART_READY', 'cart edit mode'),
        on: {
          ADD_ITEM: {
            actions: 'addItemToCart',
          },
          REMOVE_ITEM: {
            actions: 'removeItemFromCart',
          },
          UPDATE_QUANTITY: {
            actions: 'updateItemQuantity',
          },
          DEV_TAMPER_PRICE: {
            actions: 'tamperCartPrice',
          },
          VALIDATE_CHECKOUT: [
            {
              guard: 'canEnterCheckout',
              target: 'CHECKOUT_VALIDATED',
              actions: [
                'snapshotLastValidCart',
                'assignIdempotencyKey',
                'clearError',
                'releaseSubmissionLock',
              ],
            },
            {
              target: 'ORDER_INCONSISTENT',
              actions: 'captureValidationError',
            },
          ],
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
      CHECKOUT_VALIDATED: {
        entry: buildEntryActions('CHECKOUT_VALIDATED', 'checkout accepted'),
        on: {
          DEV_TAMPER_PRICE: {
            actions: 'tamperCartPrice',
          },
          RETURN_TO_CART: {
            target: 'CART_READY',
            actions: 'releaseSubmissionLock',
          },
          SUBMIT_ORDER: [
            {
              guard: 'canSubmitOrder',
              target: 'ORDER_SUBMITTED',
              actions: 'lockSubmission',
            },
            {
              actions: 'captureSubmitBlocked',
            },
          ],
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
      ORDER_SUBMITTED: {
        entry: buildEntryActions('ORDER_SUBMITTED', 'submission started'),
        invoke: {
          src: 'submitOrderActor',
          input: ({ context }) => {
            return { context };
          },
          onDone: {
            target: 'ORDER_SUCCESS',
            actions: 'storeOrderReference',
          },
          onError: [
            {
              guard: 'isInconsistentFailure',
              target: 'ORDER_INCONSISTENT',
              actions: 'captureSubmissionError',
            },
            {
              target: 'ORDER_FAILED',
              actions: 'captureSubmissionError',
            },
          ],
        },
        on: {
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
      ORDER_SUCCESS: {
        entry: buildEntryActions('ORDER_SUCCESS', 'order completed'),
        on: {
          RESET: {
            target: 'CART_READY',
            actions: 'resetForNextOrder',
          },
          ADD_ITEM: {
            target: 'CART_READY',
            actions: ['resetForNextOrder', 'addItemToCart'],
          },
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
      ORDER_FAILED: {
        entry: buildEntryActions('ORDER_FAILED', 'submission failed'),
        on: {
          RETRY: {
            target: 'CHECKOUT_VALIDATED',
            actions: [
              'assignIdempotencyKey',
              'clearError',
              'releaseSubmissionLock',
            ],
          },
          ROLLBACK: {
            target: 'ROLLED_BACK',
            actions: [
              'rollbackCart',
              'clearIdempotencyKey',
              'clearError',
              'releaseSubmissionLock',
            ],
          },
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
      ORDER_INCONSISTENT: {
        entry: buildEntryActions('ORDER_INCONSISTENT', 'integrity conflict'),
        on: {
          RETRY: {
            target: 'CHECKOUT_VALIDATED',
            actions: [
              'assignIdempotencyKey',
              'clearError',
              'releaseSubmissionLock',
            ],
          },
          ROLLBACK: {
            target: 'ROLLED_BACK',
            actions: [
              'rollbackCart',
              'clearIdempotencyKey',
              'clearError',
              'releaseSubmissionLock',
            ],
          },
          RETURN_TO_CART: {
            target: 'CART_READY',
            actions: 'releaseSubmissionLock',
          },
        },
      },
      ROLLED_BACK: {
        entry: buildEntryActions('ROLLED_BACK', 'rollback complete'),
        on: {
          CONTINUE: [
            {
              guard: 'canContinueAfterRollback',
              target: 'CART_READY',
              actions: ['clearError', 'releaseSubmissionLock'],
            },
            {
              actions: 'captureContinueBlocked',
            },
          ],
          ADD_ITEM: {
            target: 'CART_READY',
            actions: 'addItemToCart',
          },
          CART_CONFLICT: {
            target: 'ORDER_INCONSISTENT',
            actions: 'captureConflict',
          },
        },
      },
    },
  });
};
