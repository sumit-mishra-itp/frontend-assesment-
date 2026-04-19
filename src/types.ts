export type OrderStateValue =
  | 'CART_READY'
  | 'CHECKOUT_VALIDATED'
  | 'ORDER_SUBMITTED'
  | 'ORDER_SUCCESS'
  | 'ORDER_FAILED'
  | 'ORDER_INCONSISTENT'
  | 'ROLLED_BACK';

export interface Product {
  id: number;
  sourceId: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface CartItem {
  productId: number;
  sourceId: number;
  title: string;
  image: string;
  quantity: number;
  livePrice: number;
  snapshotPrice: number;
  lineChecksum: string;
}

export interface CartSnapshot {
  items: CartItem[];
  checksum: string;
  version: number;
  updatedAt: number;
}

export interface TransitionHistoryEntry {
  state: OrderStateValue;
  at: string;
  reason: string;
}

export interface OrderMachineContext {
  cart: CartSnapshot;
  lastValidCart: CartSnapshot;
  idempotencyKey: string | null;
  submissionLocked: boolean;
  errorMessage: string | null;
  orderReference: number | null;
  transitionHistory: TransitionHistoryEntry[];
}

export type OrderMachineEvent =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: number }
  | { type: 'UPDATE_QUANTITY'; productId: number; quantity: number }
  | { type: 'DEV_TAMPER_PRICE'; productId?: number; delta: number }
  | { type: 'PERSISTENCE_FAILURE'; reason: string }
  | { type: 'VALIDATE_CHECKOUT' }
  | { type: 'RETURN_TO_CART' }
  | { type: 'SUBMIT_ORDER' }
  | { type: 'RETRY' }
  | { type: 'ROLLBACK' }
  | { type: 'CONTINUE' }
  | { type: 'RESET' }
  | { type: 'CART_CONFLICT'; reason: string; remoteVersion: number };

export interface PersistedMachineState {
  state: OrderStateValue;
  context: OrderMachineContext;
  updatedAt: number;
}

export type NotificationLevel = 'info' | 'success' | 'warn' | 'error';

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  message: string;
  source: string;
  createdAt: number;
}

export type LogCategory = 'transition' | 'security' | 'system';

export interface LogEntry {
  id: string;
  category: LogCategory;
  event: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface DiagnosticExport {
  exportedAt: string;
  currentState: OrderStateValue;
  transitionHistory: TransitionHistoryEntry[];
  cartMetadata: {
    itemCount: number;
    checksum: string;
    version: number;
    lastUpdatedAt: string;
  };
  recentLogs: LogEntry[];
}
