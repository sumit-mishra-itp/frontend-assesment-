# Debugging and Observability Evidence

Date: 2026-04-17

## Scenario Used

Scenario: Forced order failure on next submit, then recovery through retry.

Goal: Verify that failure is detected, surfaced to users, logged structurally, and recoverable without breaking lifecycle consistency.

## Breakpoint and Inspection Record

| Breakpoint location | Variables inspected | Decision taken | Verification result |
| --- | --- | --- | --- |
| src/services/orders.ts (submitOrderToJsonPlaceholder) | debugForceFailureOnce flag, payload checksum, idempotencyKey | Confirm one-shot forced failure branch is entered only once | First submit failed as expected |
| src/machine/orderMachine.ts (captureSubmissionError) | submission error kind/message, current state | Confirm ORDER_FAILED path is used for upstream failure | Error message persisted and retry path exposed |
| src/hooks/useOrderMachineController.ts (state-change notification effect) | previousState, currentState, context.errorMessage | Confirm user receives ORDER_FAILED and retry guidance notification | Notification emitted once and dedup behavior preserved |

## Observability Evidence

Structured logs are emitted through src/services/observability.ts as JSON payloads with category, event, timestamp, and metadata.

Relevant events for this scenario:

- transition: event_dispatched (SUBMIT_ORDER)
- transition: state_entered (ORDER_SUBMITTED)
- system: order_submission_failed
- transition: state_entered (ORDER_FAILED)
- transition: event_dispatched (RETRY)
- transition: state_entered (CHECKOUT_VALIDATED)

[diagnostic info](docs/diagnostic.json)

