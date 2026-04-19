import type { CartSnapshot, LogEntry, PersistedMachineState, Product } from '../types';
import { createEmptyCart } from './cart';

export const STORAGE_KEYS = {
  products: 'checkout:products:v1',
  cart: 'checkout:cart:v1',
  machine: 'checkout:machine:v1',
  logs: 'checkout:logs:v1',
  debugForceFailureOnce: 'checkout:debug:force-failure-once',
  debugForceTimeoutOnce: 'checkout:debug:force-timeout-once',
  debugForceInvalidResponseOnce: 'checkout:debug:force-invalid-response-once',
  debugForcePersistenceFailureOnce: 'checkout:debug:force-persistence-failure-once',
} as const;

const safeRead = <T>(key: string, fallback: T): T => {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const safeWrite = <T>(key: string, value: T): boolean => {
  if (localStorage.getItem(STORAGE_KEYS.debugForcePersistenceFailureOnce) === '1') {
    localStorage.removeItem(STORAGE_KEYS.debugForcePersistenceFailureOnce);
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Ignore storage quota issues so checkout flow continues in-memory.
    return false;
  }
};

export const loadCachedProducts = (): Product[] => {
  const cached = safeRead<Product[]>(STORAGE_KEYS.products, []);

  if (!Array.isArray(cached)) {
    return [];
  }

  return cached;
};

export const saveCachedProducts = (products: Product[]): boolean => {
  return safeWrite(STORAGE_KEYS.products, products);
};

export const loadCartSnapshot = (): CartSnapshot => {
  const cached = safeRead<CartSnapshot | null>(STORAGE_KEYS.cart, null);

  if (!cached || !Array.isArray(cached.items)) {
    return createEmptyCart();
  }

  return cached;
};

export const saveCartSnapshot = (cart: CartSnapshot): boolean => {
  return safeWrite(STORAGE_KEYS.cart, cart);
};

export const loadPersistedMachineState = (): PersistedMachineState | null => {
  const cached = safeRead<PersistedMachineState | null>(STORAGE_KEYS.machine, null);

  if (!cached || typeof cached.state !== 'string' || !cached.context) {
    return null;
  }

  return cached;
};

export const savePersistedMachineState = (state: PersistedMachineState): boolean => {
  return safeWrite(STORAGE_KEYS.machine, state);
};

export const loadObservabilityLogs = (): LogEntry[] => {
  const cached = safeRead<LogEntry[]>(STORAGE_KEYS.logs, []);

  if (!Array.isArray(cached)) {
    return [];
  }

  return cached;
};

export const saveObservabilityLogs = (logs: LogEntry[]): void => {
  safeWrite(STORAGE_KEYS.logs, logs);
};
