import { useMachine } from '@xstate/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createOrderMachine,
  normalizePersistedState,
} from '../machine/orderMachine';
import { logStructuredEvent } from '../services/observability';
import {
  STORAGE_KEYS,
  loadCartSnapshot,
  loadPersistedMachineState,
  saveCartSnapshot,
  savePersistedMachineState,
} from '../services/storage';
import type {
  CartSnapshot,
  NotificationLevel,
  OrderMachineEvent,
  OrderStateValue,
} from '../types';

interface NotificationInput {
  message: string;
  level: NotificationLevel;
  source: string;
}

type EnqueueNotification = (input: NotificationInput) => boolean;

export const useOrderMachineController = (
  enqueueNotification: EnqueueNotification,
) => {
  const persistedMachineState = useMemo(() => {
    const cachedCart = loadCartSnapshot();
    const savedState = loadPersistedMachineState();
    return normalizePersistedState(savedState, cachedCart);
  }, []);

  const machine = useMemo(() => {
    return createOrderMachine(persistedMachineState);
  }, [persistedMachineState]);

  const [snapshot, send] = useMachine(machine);
  const currentState = snapshot.value as OrderStateValue;

  const previousState = useRef<OrderStateValue>(currentState);
  const previousError = useRef<string | null>(null);
  const currentCartVersion = useRef<number>(snapshot.context.cart.version);
  const lastPersistedCartPayload = useRef<string>(JSON.stringify(snapshot.context.cart));
  const lastConflictRemoteVersion = useRef<number | null>(null);
  const persistenceFailureActive = useRef<boolean>(false);
  const cartObserverInitialized = useRef<boolean>(false);
  const previousCartLineCount = useRef<number>(snapshot.context.cart.items.length);
  const previousCartVersion = useRef<number>(snapshot.context.cart.version);

  const sendWithAudit = useCallback(
    (event: OrderMachineEvent, metadata: Record<string, unknown> = {}) => {
      logStructuredEvent('transition', 'event_dispatched', {
        eventType: event.type,
        stateBefore: snapshot.value,
        ...metadata,
      });
      send(event);
    },
    [send, snapshot.value],
  );

  useEffect(() => {
    const persistedState = {
      state: currentState,
      context: snapshot.context,
      updatedAt: Date.now(),
    };

    const machineStateSaved = savePersistedMachineState(persistedState);

    if (!machineStateSaved && !persistenceFailureActive.current) {
      persistenceFailureActive.current = true;
      sendWithAudit({
        type: 'PERSISTENCE_FAILURE',
        reason: 'machine_state_write_failed',
      });
      enqueueNotification({
        level: 'error',
        source: 'persistence',
        message: 'Persistence failure detected while saving lifecycle state.',
      });
      return;
    }

    if (machineStateSaved && persistenceFailureActive.current) {
      persistenceFailureActive.current = false;
      enqueueNotification({
        level: 'success',
        source: 'persistence',
        message: 'Persistence recovered after previous write failure.',
      });
    }
  }, [currentState, enqueueNotification, sendWithAudit, snapshot.context]);

  useEffect(() => {
    const cartPayload = JSON.stringify(snapshot.context.cart);
    currentCartVersion.current = snapshot.context.cart.version;

    if (cartPayload === lastPersistedCartPayload.current) {
      return;
    }

    const cartSaved = saveCartSnapshot(snapshot.context.cart);

    if (!cartSaved && !persistenceFailureActive.current) {
      persistenceFailureActive.current = true;
      sendWithAudit({
        type: 'PERSISTENCE_FAILURE',
        reason: 'cart_snapshot_write_failed',
      });
      enqueueNotification({
        level: 'error',
        source: 'persistence',
        message: 'Persistence failure detected while saving cart snapshot.',
      });
      return;
    }

    if (cartSaved && persistenceFailureActive.current) {
      persistenceFailureActive.current = false;
      enqueueNotification({
        level: 'success',
        source: 'persistence',
        message: 'Cart persistence recovered after previous failure.',
      });
    }

    lastPersistedCartPayload.current = cartPayload;
    lastConflictRemoteVersion.current = null;
  }, [enqueueNotification, sendWithAudit, snapshot.context.cart]);

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== STORAGE_KEYS.cart || !storageEvent.newValue) {
        return;
      }

      try {
        const incomingCart = JSON.parse(storageEvent.newValue) as CartSnapshot;

        if (incomingCart.version === currentCartVersion.current) {
          lastConflictRemoteVersion.current = null;
          return;
        }

        if (lastConflictRemoteVersion.current === incomingCart.version) {
          return;
        }

        lastConflictRemoteVersion.current = incomingCart.version;

        sendWithAudit(
          {
            type: 'CART_CONFLICT',
            reason: 'Cart changed in another tab.',
            remoteVersion: incomingCart.version,
          },
          {
            localVersion: currentCartVersion.current,
            remoteVersion: incomingCart.version,
          },
        );
        enqueueNotification({
          level: 'warn',
          source: 'security',
          message:
            'Cross-tab cart mutation detected. Lifecycle moved to ORDER_INCONSISTENT.',
        });
      } catch {
        enqueueNotification({
          level: 'error',
          source: 'security',
          message: 'Corrupted cart payload detected in storage event.',
        });
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [enqueueNotification, sendWithAudit]);

  useEffect(() => {
    if (previousState.current === currentState) {
      return;
    }

    if (currentState === 'ORDER_SUCCESS') {
      enqueueNotification({
        level: 'success',
        source: 'order',
        message: `Order completed with reference ${snapshot.context.orderReference}.`,
      });
    }

    if (currentState === 'CHECKOUT_VALIDATED') {
      enqueueNotification({
        level: 'success',
        source: 'checkout',
        message: 'Checkout validation passed. Order can be submitted.',
      });
    }

    if (currentState === 'ORDER_SUBMITTED') {
      enqueueNotification({
        level: 'info',
        source: 'order',
        message: 'Order submitted. UI is locked until completion.',
      });
    }

    if (currentState === 'ORDER_FAILED') {
      enqueueNotification({
        level: 'error',
        source: 'order',
        message: 'Order submission failed. Retry or rollback is required.',
      });
    }

    if (currentState === 'ORDER_INCONSISTENT') {
      enqueueNotification({
        level: 'warn',
        source: 'security',
        message: 'Integrity conflict detected. Review cart and choose Retry or Rollback.',
      });
    }

    if (currentState === 'ROLLED_BACK') {
      enqueueNotification({
        level: 'info',
        source: 'order',
        message: 'Rollback completed. Cart reverted to last valid snapshot.',
      });
    }

    previousState.current = currentState;
  }, [currentState, enqueueNotification, snapshot.context.orderReference]);

  useEffect(() => {
    if (!snapshot.context.errorMessage) {
      previousError.current = null;
      return;
    }

    if (previousError.current === snapshot.context.errorMessage) {
      return;
    }

    previousError.current = snapshot.context.errorMessage;
    enqueueNotification({
      level: 'error',
      source: 'machine',
      message: snapshot.context.errorMessage,
    });
  }, [enqueueNotification, snapshot.context.errorMessage]);

  useEffect(() => {
    const cartVersion = snapshot.context.cart.version;

    if (!cartObserverInitialized.current) {
      cartObserverInitialized.current = true;
      previousCartVersion.current = cartVersion;
      previousCartLineCount.current = snapshot.context.cart.items.length;
      return;
    }

    if (cartVersion === previousCartVersion.current) {
      return;
    }

    const currentLines = snapshot.context.cart.items.length;
    const previousLines = previousCartLineCount.current;

    let message = 'Cart updated successfully: quantity changed.';

    if (currentLines > previousLines) {
      message = 'Cart updated successfully: item added.';
    }

    if (currentLines < previousLines) {
      message = 'Cart updated successfully: item removed.';
    }

    enqueueNotification({
      level: 'success',
      source: 'cart',
      message,
    });

    previousCartVersion.current = cartVersion;
    previousCartLineCount.current = currentLines;
  }, [enqueueNotification, snapshot.context.cart.items.length, snapshot.context.cart.version]);

  const getCurrentCartVersion = useCallback(() => {
    return currentCartVersion.current;
  }, []);

  return {
    snapshot,
    currentState,
    sendWithAudit,
    getCurrentCartVersion,
  };
};
