import { useCallback } from 'react';
import { getRecentLogs, logStructuredEvent } from '../services/observability';
import { validateCartIntegrity } from '../services/security';
import { STORAGE_KEYS } from '../services/storage';
import type {
  DiagnosticExport,
  NotificationLevel,
  OrderMachineContext,
  OrderMachineEvent,
  OrderStateValue,
} from '../types';

interface NotificationInput {
  message: string;
  level: NotificationLevel;
  source: string;
}

type EnqueueNotification = (input: NotificationInput) => boolean;

interface UseCheckoutActionsArgs {
  currentState: OrderStateValue;
  context: OrderMachineContext;
  sendWithAudit: (
    event: OrderMachineEvent,
    metadata?: Record<string, unknown>,
  ) => void;
  productPriceById: Map<number, number>;
  getCurrentCartVersion: () => number;
  enqueueNotification: EnqueueNotification;
  setCopiedAt: (value: string | null) => void;
}

export const useCheckoutActions = ({
  currentState,
  context,
  sendWithAudit,
  productPriceById,
  getCurrentCartVersion,
  enqueueNotification,
  setCopiedAt,
}: UseCheckoutActionsArgs) => {
  const checkoutLocked =
    context.submissionLocked || currentState === 'ORDER_SUBMITTED';
  const isCartEmpty = context.cart.items.length === 0;

  const handleValidateCheckout = useCallback(() => {
    const integrityResult = validateCartIntegrity(
      context.cart,
      'CHECKOUT_VALIDATED precheck',
    );

    if (!integrityResult.valid) {
      sendWithAudit(
        { type: 'VALIDATE_CHECKOUT' },
        {
          integrityReason: integrityResult.reason,
          checksumValid: integrityResult.checksumValid,
          tamperedLineIds: integrityResult.tamperedLineIds,
        },
      );
      return;
    }

    const staleLineIds = context.cart.items
      .filter((item) => {
        const latestPrice = productPriceById.get(item.productId);

        if (typeof latestPrice !== 'number') {
          return true;
        }

        return Math.abs(latestPrice - item.livePrice) > 0.009;
      })
      .map((item) => item.productId);

    if (staleLineIds.length > 0) {
      const remoteVersion = Math.max(getCurrentCartVersion() + 1, Date.now());

      sendWithAudit(
        {
          type: 'CART_CONFLICT',
          reason: 'Stale cart vs refreshed product snapshot detected.',
          remoteVersion,
        },
        {
          staleLineIds,
        },
      );
      enqueueNotification({
        level: 'warn',
        source: 'security',
        message:
          'Checkout blocked because cart prices are stale against latest product snapshot.',
      });
      return;
    }

    sendWithAudit({ type: 'VALIDATE_CHECKOUT' });
  }, [context.cart, enqueueNotification, getCurrentCartVersion, productPriceById, sendWithAudit]);

  const handleSubmitOrder = useCallback(() => {
    if (checkoutLocked) {
      enqueueNotification({
        level: 'warn',
        source: 'order',
        message: 'Retry blocked by idempotency lock while submission is in progress.',
      });
      return;
    }

    sendWithAudit({ type: 'SUBMIT_ORDER' });
  }, [checkoutLocked, enqueueNotification, sendWithAudit]);

  const handleRetry = useCallback(() => {
    if (currentState === 'ORDER_FAILED' || currentState === 'ORDER_INCONSISTENT') {
      sendWithAudit({ type: 'RETRY' });
      enqueueNotification({
        level: 'info',
        source: 'order',
        message: 'Retry scheduled with a fresh idempotency key.',
      });
      return;
    }

    enqueueNotification({
      level: 'warn',
      source: 'order',
      message: 'Retry blocked by idempotency/lifecycle constraints.',
    });
  }, [currentState, enqueueNotification, sendWithAudit]);

  const handleCopyDiagnostics = useCallback(async () => {
    const exportPayload: DiagnosticExport = {
      exportedAt: new Date().toISOString(),
      currentState,
      transitionHistory: context.transitionHistory,
      cartMetadata: {
        itemCount: context.cart.items.length,
        checksum: context.cart.checksum,
        version: context.cart.version,
        lastUpdatedAt: new Date(context.cart.updatedAt).toISOString(),
      },
      recentLogs: getRecentLogs(80),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
      const copiedTimestamp = new Date().toLocaleTimeString();
      setCopiedAt(copiedTimestamp);
      enqueueNotification({
        level: 'success',
        source: 'diagnostics',
        message: 'Diagnostic payload copied to clipboard.',
      });
    } catch {
      enqueueNotification({
        level: 'error',
        source: 'diagnostics',
        message: 'Clipboard write failed. Browser denied permission.',
      });
    }
  }, [context, currentState, enqueueNotification, setCopiedAt]);

  const handleRunDemoCommand = useCallback(
    (command: string) => {
      const normalized = command.trim().toLowerCase();

      if (!normalized) {
        return;
      }

      if (normalized === 'help') {
        enqueueNotification({
          level: 'info',
          source: 'devtools',
          message:
            'Commands: fail-next, timeout-next, invalid-response-next, persist-fail-next, tamper-price, tamper-price:-10, conflict, retry-now, clear-debug, help',
        });
        return;
      }

      if (normalized === 'fail-next') {
        localStorage.setItem(STORAGE_KEYS.debugForceFailureOnce, '1');
        logStructuredEvent('system', 'demo_force_failure_armed', {
          key: STORAGE_KEYS.debugForceFailureOnce,
        });
        enqueueNotification({
          level: 'info',
          source: 'devtools',
          message: 'Next order submission will fail once (forced).',
        });
        return;
      }

      if (normalized === 'timeout-next') {
        localStorage.setItem(STORAGE_KEYS.debugForceTimeoutOnce, '1');
        enqueueNotification({
          level: 'info',
          source: 'devtools',
          message: 'Next order submission will timeout once (simulated).',
        });
        return;
      }

      if (normalized === 'invalid-response-next') {
        localStorage.setItem(STORAGE_KEYS.debugForceInvalidResponseOnce, '1');
        enqueueNotification({
          level: 'info',
          source: 'devtools',
          message: 'Next order submission will simulate invalid API response.',
        });
        return;
      }

      if (normalized === 'persist-fail-next') {
        localStorage.setItem(STORAGE_KEYS.debugForcePersistenceFailureOnce, '1');
        enqueueNotification({
          level: 'info',
          source: 'devtools',
          message: 'Next local persistence write will fail once (simulated).',
        });
        return;
      }

      if (normalized === 'retry-now') {
        handleRetry();
        return;
      }

      if (normalized.startsWith('tamper-price')) {
        if (context.cart.items.length === 0) {
          enqueueNotification({
            level: 'warn',
            source: 'devtools',
            message: 'Cannot tamper because the cart is empty.',
          });
          return;
        }

        const token = normalized.split(':')[1];
        const parsedDelta = token ? Number(token) : -5;
        const delta = Number.isFinite(parsedDelta) ? parsedDelta : -5;

        sendWithAudit({
          type: 'DEV_TAMPER_PRICE',
          delta,
        });
        enqueueNotification({
          level: 'warn',
          source: 'devtools',
          message: `Applied demo price tampering delta ${delta.toFixed(2)}.`,
        });
        return;
      }

      if (normalized === 'conflict') {
        const remoteVersion = Math.max(getCurrentCartVersion() + 1, Date.now());
        sendWithAudit({
          type: 'CART_CONFLICT',
          reason: 'Manual conflict from devtools command.',
          remoteVersion,
        });
        enqueueNotification({
          level: 'warn',
          source: 'devtools',
          message: 'Injected manual CART_CONFLICT event.',
        });
        return;
      }

      if (normalized === 'clear-debug') {
        localStorage.removeItem(STORAGE_KEYS.debugForceFailureOnce);
        localStorage.removeItem(STORAGE_KEYS.debugForceTimeoutOnce);
        localStorage.removeItem(STORAGE_KEYS.debugForceInvalidResponseOnce);
        localStorage.removeItem(STORAGE_KEYS.debugForcePersistenceFailureOnce);
        enqueueNotification({
          level: 'success',
          source: 'devtools',
          message: 'Cleared demo debug flags.',
        });
        return;
      }

      enqueueNotification({
        level: 'warn',
        source: 'devtools',
        message: `Unknown command: ${normalized}`,
      });
    },
    [context.cart.items.length, enqueueNotification, getCurrentCartVersion, handleRetry, sendWithAudit],
  );

  return {
    checkoutLocked,
    isCartEmpty,
    handleValidateCheckout,
    handleSubmitOrder,
    handleRetry,
    handleCopyDiagnostics,
    handleRunDemoCommand,
  };
};
