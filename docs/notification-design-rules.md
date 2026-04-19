# Notification Design and Rules

## Scope

This document defines notification queue behavior, deduplication, dismissal rules, ARIA accessibility behavior, and trigger coverage for checkout lifecycle events.

## Queue and Timing Rules

| Rule | Implementation behavior |
| --- | --- |
| Queue append behavior | Notifications are appended, not overwritten |
| Queue size bound | Queue retains latest 10 entries |
| Dedup window | 3000 ms dedup window using level+source+message key |
| Auto-dismiss timeout | 6000 ms after enqueue |
| Manual dismiss | Every notification includes an explicit Dismiss action |

Implementation source: src/hooks/useNotifications.ts.

## Accessibility Behavior

- NotificationCenter includes a screen-reader-only live region.
- Live region settings:
  - role status
  - aria-live polite
- Latest message is mirrored into liveMessage for assistive technology announcement without interrupting keyboard flow.

Implementation source: src/components/NotificationCenter.tsx.

## Trigger Table (Required Coverage)

| Trigger group | Example trigger | Notification behavior | Level | Source |
| --- | --- | --- | --- | --- |
| Cart update success | Add/remove/update quantity changes cart version | Cart updated successfully message | success | cart |
| Validation pass | State enters CHECKOUT_VALIDATED | Checkout validation passed message | success | checkout |
| Validation fail | Integrity/stale conflict blocks validation | Error plus conflict warning path | error and warn | machine and security |
| Order submit | State enters ORDER_SUBMITTED | UI locked while order submits message | info | order |
| Order success | State enters ORDER_SUCCESS | Order completed with reference message | success | order |
| Order failure | State enters ORDER_FAILED | Submission failed with retry or rollback guidance | error | order |
| Retry scheduled | Retry action from ORDER_FAILED or ORDER_INCONSISTENT | Retry scheduled with fresh idempotency key | info | order |
| Retry blocked | Retry attempted outside allowed states or while locked | Retry blocked by constraints warning | warn | order |
| Tamper/conflict alerts | Price tamper, CART_CONFLICT, stale snapshot conflict | Integrity conflict and cross-tab warnings | warn | security |

## UX Notes

- Notifications are non-modal and do not block checkout controls.
- Severity color coding (info/success/warn/error) aligns with urgency.
- Queue count is visible to help reviewers verify burst behavior and dedup rules.

## Reference Files

- src/hooks/useNotifications.ts
- src/components/NotificationCenter.tsx
- src/hooks/useOrderMachineController.ts
- src/hooks/useCheckoutActions.ts
