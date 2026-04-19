# Secure Checkout Architecture

## End-to-End Data Flow (Product Fetch to Checkout Submission)

1. Product fetch and scaling
   - TanStack Query calls getReplicatedProducts in src/services/products.ts.
   - Data is pulled from Fake Store API and replicated to 800 items.
   - The replicated result is cached in localStorage and reused on fallback.

2. Catalog shaping and UI controls
   - useProductCatalog applies search, category filter, and sort mode.
   - Filtering and derived maps are memoized for stable rendering under load.
   - Product cards dispatch ADD_ITEM into the lifecycle machine.

3. Cart mutation and integrity primitives
   - Cart writes happen through add/remove/update helpers in src/services/cart.ts.
   - Every mutation recalculates line checksum, cart checksum, updatedAt, and version.
   - Each line stores both snapshotPrice and livePrice for tamper/staleness checks.

4. Checkout validation gate
   - useCheckoutActions validates integrity first, then stale snapshot mismatch.
   - If valid, the machine transitions CART_READY -> CHECKOUT_VALIDATED and creates idempotency key.
   - If invalid, the flow transitions to ORDER_INCONSISTENT with a reasoned error.

5. Submission and result handling
   - ORDER_SUBMITTED invokes submitOrderActor, which performs a second integrity check before POST.
   - Order is posted to JSONPlaceholder with X-Idempotency-Key header.
   - Success stores order reference; failure routes to ORDER_FAILED or ORDER_INCONSISTENT.

6. Persistence, recovery, and cross-tab protection
   - Machine context and cart snapshot are persisted separately in localStorage.
   - On refresh, normalizePersistedState restores the previous lifecycle state and cart.
   - Cross-tab cart writes emit CART_CONFLICT and move flow to ORDER_INCONSISTENT.

7. User feedback and observability
   - Notifications are queued, deduplicated, auto-dismissed, and announced via ARIA live region.
   - Structured logs are written through src/services/observability.ts for transition/security/system events.

## State Machine Transitions and Reasons

| From state | Event | Guard or reason | To state | Why |
| --- | --- | --- | --- | --- |
| CART_READY | VALIDATE_CHECKOUT | canEnterCheckout = true | CHECKOUT_VALIDATED | Cart is non-empty and integrity checks pass |
| CART_READY | VALIDATE_CHECKOUT | canEnterCheckout = false | ORDER_INCONSISTENT | Empty cart or checksum/baseline mismatch must block checkout |
| CHECKOUT_VALIDATED | SUBMIT_ORDER | canSubmitOrder = true | ORDER_SUBMITTED | Idempotency key exists and submission lock is clear |
| CHECKOUT_VALIDATED | SUBMIT_ORDER | canSubmitOrder = false | CHECKOUT_VALIDATED | Duplicate or invalid submit is blocked with explicit reason |
| ORDER_SUBMITTED | invoke success | upstream accepted request | ORDER_SUCCESS | Persist order reference and close attempt |
| ORDER_SUBMITTED | invoke error | upstream failure | ORDER_FAILED | Retry or rollback path is required |
| ORDER_SUBMITTED | invoke error | integrity inconsistency | ORDER_INCONSISTENT | Security conflict path has priority |
| ORDER_FAILED | RETRY | retry selected | CHECKOUT_VALIDATED | New idempotency key for next attempt |
| ORDER_FAILED | ROLLBACK | rollback selected | ROLLED_BACK | Restores last valid snapshot and clears pending key |
| ORDER_INCONSISTENT | RETRY | retry selected | CHECKOUT_VALIDATED | Allows re-validation and another submit attempt |
| ORDER_INCONSISTENT | ROLLBACK | rollback selected | ROLLED_BACK | Revert to trusted cart snapshot |
| ROLLED_BACK | CONTINUE | canContinueAfterRollback = true | CART_READY | Return to editable cart flow |
| ROLLED_BACK | CONTINUE | canContinueAfterRollback = false | ROLLED_BACK | Continue is blocked when cart is empty |
| Any state | PERSISTENCE_FAILURE | storage write failed | ORDER_INCONSISTENT | Prevents silent divergence between UI and persisted state |

## Design Decisions

- XState was chosen because explicit states and guarded transitions make checkout rules auditable and easier to defend during assessment.
- Virtualization was chosen because 800 product rows would otherwise create avoidable DOM and render pressure.
- Local persistence was chosen so refresh recovery, cross-tab conflict simulation, and deterministic demo commands remain possible without backend storage.

## Edge Case Matrix (Mandatory)

Manual pass date: 2026-04-17.

| Edge case | Trigger | Expected behavior | Actual implementation control | Manual outcome notes |
| --- | --- | --- | --- | --- |
| Refresh during submit | Refresh browser while ORDER_SUBMITTED is active | State restores as ORDER_SUBMITTED and flow resumes safely | Persisted machine state restored by normalizePersistedState and useOrderMachineController | Pass. Lifecycle restored instead of resetting to CART_READY |
| Double-click protection | Click Submit order repeatedly | Only first submit is accepted; duplicates blocked | submissionLocked plus canSubmitOrder guard plus disabled UI button | Pass. Additional click remained blocked with warning behavior |
| Two-tab conflict | Edit cart in tab B while tab A is active | Tab A transitions to ORDER_INCONSISTENT | storage listener dispatches CART_CONFLICT; machine captureConflict action | Pass. Conflict path triggered consistently |
| Timeout simulation | Run timeout-next then submit | Submission fails into ORDER_FAILED | submitOrderToJsonPlaceholder timeout flag and onError transition | Pass. Retry and rollback actions became available |
| Invalid response simulation | Run invalid-response-next then submit | Submission fails into ORDER_FAILED | Deterministic invalid response path in src/services/orders.ts | Pass. Error surfaced and lifecycle moved to ORDER_FAILED |
| Persistence failure to inconsistent | Run persist-fail-next and perform write | Flow moves to ORDER_INCONSISTENT | saveCartSnapshot/savePersistedMachineState false -> PERSISTENCE_FAILURE event | Pass. Inconsistent state reached with persistence error message |
| Price tamper | Run tamper-price and validate/submit | Integrity conflict blocks flow | validateCartIntegrity and submit-time integrity recheck | Pass. Tampering produced ORDER_INCONSISTENT |
| Stale snapshot | Product snapshot differs from cart live price at validation | Validation blocked and conflict raised | useCheckoutActions stale-line detection dispatches CART_CONFLICT | Pass. Pre-submit stale check prevented continuation |
| Retry vs rollback | From ORDER_FAILED or ORDER_INCONSISTENT choose Retry or Rollback | Retry returns to CHECKOUT_VALIDATED, rollback to ROLLED_BACK | RETRY and ROLLBACK transitions in machine | Pass. Both recovery paths behaved as designed |

## PWA Notes

- public/manifest.webmanifest enables installability.
- public/sw.js caches app shell and product endpoint responses.
- Local cart and machine context persistence supports refresh-safe lifecycle recovery.
