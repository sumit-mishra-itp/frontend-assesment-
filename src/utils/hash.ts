import type { CartItem } from '../types';

export const normalizePrice = (value: number): number => {
  return Number(value.toFixed(2));
};

export const hashString = (value: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildLineChecksum = (item: Pick<CartItem, 'productId' | 'quantity' | 'livePrice'>): string => {
  const normalizedPrice = normalizePrice(item.livePrice);
  return hashString(`${item.productId}:${item.quantity}:${normalizedPrice.toFixed(2)}`);
};

export const buildCartChecksum = (items: CartItem[]): string => {
  const payload = items
    .slice()
    .sort((first, second) => first.productId - second.productId)
    .map((item) => `${item.productId}:${item.quantity}:${normalizePrice(item.livePrice).toFixed(2)}`)
    .join('|');

  return hashString(payload);
};
