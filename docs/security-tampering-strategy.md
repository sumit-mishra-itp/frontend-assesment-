# Frontend Security and Tampering Strategy

## Scope

This is a frontend-only defense strategy focused on detection, explicit transition blocking, user-visible warnings, and structured logs.

## Threat Matrix

| Simulated threat | Detection method | Blocked or forced transition | User-facing notification | Structured log event |
| --- | --- | --- | --- | --- |
| Price tamper | validateCartIntegrity combines snapshotPrice/livePrice comparison and checksum verification | VALIDATE_CHECKOUT routes to ORDER_INCONSISTENT when integrity fails; submit actor also re-checks integrity and routes to ORDER_INCONSISTENT | Integrity conflict warning with machine error reason | checkout_validation_blocked, order_submission_integrity_blocked |
| Cross-tab conflict | storage-driven version mismatch emits CART_CONFLICT | CART_CONFLICT transitions current lifecycle state to ORDER_INCONSISTENT | Cross-tab cart mutation warning | cross_tab_conflict_detected |
| Stale snapshot vs refreshed product data | Pre-check in useCheckoutActions compares latest product price map to cart livePrice | Stale detection dispatches CART_CONFLICT which transitions to ORDER_INCONSISTENT | Checkout blocked due to stale cart prices warning | event_dispatched (with staleLineIds metadata), cross_tab_conflict_detected |

## Detection and Control Notes

- Tampering is validated twice: before checkout acceptance and again just before submission.
- Conflict and persistence failures are treated as security consistency failures and use ORDER_INCONSISTENT as the safe state.
- Retry and rollback remain explicit user choices after a failed or inconsistent flow.

## User Messaging Behavior

- Critical conflicts surface as warn/error notifications with actionable next steps (Retry or Rollback).
- Blocked submissions provide reasoned warnings rather than silent failures.

## Implementation References

- src/services/security.ts
	- validateCartIntegrity
	- generateIdempotencyKey
- src/machine/orderMachine.ts
	- canSubmitOrder and canEnterCheckout guards
	- captureSubmitBlocked, captureConflict, captureValidationError
	- ORDER_INCONSISTENT transition paths
- src/hooks/useCheckoutActions.ts
	- handleValidateCheckout stale snapshot pre-check
	- devtools commands for tamper and conflict simulation
	- retry blocked and retry scheduled notification paths

