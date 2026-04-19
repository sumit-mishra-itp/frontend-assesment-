import { detectSnapshotTampering, verifyCartChecksum } from './cart';
import type { CartSnapshot } from '../types';

export interface CartValidationResult {
  valid: boolean;
  checksumValid: boolean;
  tamperedLineIds: number[];
  reason: string;
}

export const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.trunc(Math.random() * 10_000)}`;
};

export const validateCartIntegrity = (
  cart: CartSnapshot,
  reasonPrefix: string,
): CartValidationResult => {
  const checksumValid = verifyCartChecksum(cart);
  const tamperedItems = detectSnapshotTampering(cart);
  const tamperedLineIds = tamperedItems.map((item) => item.productId);

  if (!checksumValid && tamperedLineIds.length > 0) {
    return {
      valid: false,
      checksumValid,
      tamperedLineIds,
      reason: `${reasonPrefix}: checksum and baseline mismatch`,
    };
  }

  if (!checksumValid) {
    return {
      valid: false,
      checksumValid,
      tamperedLineIds,
      reason: `${reasonPrefix}: checksum mismatch`,
    };
  }

  if (tamperedLineIds.length > 0) {
    return {
      valid: false,
      checksumValid,
      tamperedLineIds,
      reason: `${reasonPrefix}: baseline price mismatch`,
    };
  }

  return {
    valid: true,
    checksumValid,
    tamperedLineIds,
    reason: '',
  };
};
