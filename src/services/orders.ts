import { STORAGE_KEYS } from './storage';

interface OrderSubmissionPayload {
  idempotencyKey: string;
  checksum: string;
  total: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

const ORDER_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts';

const delay = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

export const submitOrderToJsonPlaceholder = async (
  payload: OrderSubmissionPayload,
): Promise<number> => {
  if (localStorage.getItem(STORAGE_KEYS.debugForceTimeoutOnce) === '1') {
    localStorage.removeItem(STORAGE_KEYS.debugForceTimeoutOnce);
    await delay(8_000);
    throw new Error('Simulated timeout from demo command: timeout-next');
  }

  await delay(2_000);

  if (localStorage.getItem(STORAGE_KEYS.debugForceFailureOnce) === '1') {
    localStorage.removeItem(STORAGE_KEYS.debugForceFailureOnce);
    throw new Error('Forced failure from demo command: fail-next');
  }

  // Inject deterministic instability to exercise rollback and retry code paths.
  if (Math.random() < 0.1) {
    throw new Error('Simulated 10% upstream failure');
  }

  const response = await fetch(ORDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Order API failed with status ${response.status}`);
  }

  const body = (await response.json()) as { id?: number };

  if (localStorage.getItem(STORAGE_KEYS.debugForceInvalidResponseOnce) === '1') {
    localStorage.removeItem(STORAGE_KEYS.debugForceInvalidResponseOnce);
    throw new Error('Simulated invalid API response payload: invalid-response-next');
  }

  return body.id ?? Date.now();
};
