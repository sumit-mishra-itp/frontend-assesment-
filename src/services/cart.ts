import type { CartItem, CartSnapshot, Product } from '../types';
import { buildCartChecksum, buildLineChecksum, normalizePrice } from '../utils/hash';

const clampQuantity = (quantity: number): number => {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(99, Math.max(1, Math.trunc(quantity)));
};

const nextVersion = (previousVersion: number): number => {
  return Math.max(Date.now(), previousVersion + 1);
};

export const createEmptyCart = (): CartSnapshot => {
  const now = Date.now();

  return {
    items: [],
    checksum: buildCartChecksum([]),
    updatedAt: now,
    version: now,
  };
};

export const cloneCartSnapshot = (cart: CartSnapshot): CartSnapshot => {
  return {
    items: cart.items.map((item) => ({ ...item })),
    checksum: cart.checksum,
    updatedAt: cart.updatedAt,
    version: cart.version,
  };
};

export const recalculateCartSnapshot = (
  items: CartItem[],
  previousVersion: number,
): CartSnapshot => {
  const normalizedItems = items
    .map((item) => ({
      ...item,
      quantity: clampQuantity(item.quantity),
      livePrice: normalizePrice(item.livePrice),
      snapshotPrice: normalizePrice(item.snapshotPrice),
    }))
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      ...item,
      lineChecksum: buildLineChecksum(item),
    }));

  return {
    items: normalizedItems,
    checksum: buildCartChecksum(normalizedItems),
    updatedAt: Date.now(),
    version: nextVersion(previousVersion),
  };
};

export const addProductToCart = (cart: CartSnapshot, product: Product): CartSnapshot => {
  const existingItem = cart.items.find((item) => item.productId === product.id);

  if (existingItem) {
    const nextItems = cart.items.map((item) => {
      if (item.productId !== product.id) {
        return item;
      }

      return {
        ...item,
        quantity: clampQuantity(item.quantity + 1),
      };
    });

    return recalculateCartSnapshot(nextItems, cart.version);
  }

  const newItem: CartItem = {
    productId: product.id,
    sourceId: product.sourceId,
    title: product.title,
    image: product.image,
    quantity: 1,
    livePrice: normalizePrice(product.price),
    snapshotPrice: normalizePrice(product.price),
    lineChecksum: '',
  };

  return recalculateCartSnapshot([...cart.items, newItem], cart.version);
};

export const removeProductFromCart = (
  cart: CartSnapshot,
  productId: number,
): CartSnapshot => {
  const filteredItems = cart.items.filter((item) => item.productId !== productId);
  return recalculateCartSnapshot(filteredItems, cart.version);
};

export const updateCartItemQuantity = (
  cart: CartSnapshot,
  productId: number,
  quantity: number,
): CartSnapshot => {
  const nextItems = cart.items
    .map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: clampQuantity(quantity),
      };
    })
    .filter((item) => item.quantity > 0);

  return recalculateCartSnapshot(nextItems, cart.version);
};

export const detectSnapshotTampering = (cart: CartSnapshot): CartItem[] => {
  return cart.items.filter((item) => {
    return normalizePrice(item.livePrice) !== normalizePrice(item.snapshotPrice);
  });
};

export const verifyCartChecksum = (cart: CartSnapshot): boolean => {
  const computedChecksum = buildCartChecksum(cart.items);

  if (computedChecksum !== cart.checksum) {
    return false;
  }

  return cart.items.every((item) => buildLineChecksum(item) === item.lineChecksum);
};

export const cartSubtotal = (cart: CartSnapshot): number => {
  return normalizePrice(
    cart.items.reduce((total, item) => total + item.livePrice * item.quantity, 0),
  );
};
