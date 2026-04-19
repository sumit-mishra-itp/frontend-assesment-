# Secure High-Performance Checkout Lifecycle

Frontend-only checkout simulation with explicit state transitions, integrity controls, and high-volume rendering performance.

## Reviewer Quick Links

- Architecture and edge-case matrix: [docs/architecture.md](docs/architecture.md)
- Performance techniques and evidence: [docs/performance-evidence.md](docs/performance-evidence.md)
- Security and tampering strategy: [docs/security-tampering-strategy.md](docs/security-tampering-strategy.md)
- Notification behavior rules: [docs/notification-design-rules.md](docs/notification-design-rules.md)
- Debugging and observability evidence: [docs/debugging-observability-evidence.md](docs/debugging-observability-evidence.md)
- Diagnostic export payload: [docs/diagnostic.json](docs/diagnostic.json)
- Originality declaration: [docs/originality-declaration.md](docs/originality-declaration.md)
- Video walkthrough (replace with your final published URL): [YouTube walkthrough](https://youtu.be/tekdos0M86I)

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- XState for lifecycle orchestration
- Zustand for UI slice state
- TanStack Query for product fetching/caching
- react-virtuoso for virtualized lists
- Fake Store API and JSONPlaceholder

## Run

```bash
npm install
npm run dev
```

## QA Commands

```bash
npm run lint
npm run build
npm run dev
```

## Submission Artifacts Checklist

| Artifact | Status | Link |
| --- | --- | --- |
| Architecture and transition rationale | Ready | [docs/architecture.md](docs/architecture.md) |
| Edge-case matrix with outcomes | Ready | [docs/architecture.md](docs/architecture.md#edge-case-matrix-mandatory) |
| Performance evidence with screenshots | Ready | [docs/performance-evidence.md](docs/performance-evidence.md) |
| Security/tampering write-up | Ready | [docs/security-tampering-strategy.md](docs/security-tampering-strategy.md) |
| Notification rules write-up | Ready | [docs/notification-design-rules.md](docs/notification-design-rules.md) |
| Originality declaration | Ready | [docs/originality-declaration.md](docs/originality-declaration.md) |
| Debugging and observability evidence | Ready | [docs/debugging-observability-evidence.md](docs/debugging-observability-evidence.md) |
| Diagnostic export payload | Ready | [docs/diagnostic.json](docs/diagnostic.json) |
| Screen recording (5-10 min) | Add final URL | [YouTube walkthrough](https://youtu.be/tekdos0M86I) |

## Notes for Reviewer

- Lifecycle state names are fixed and explicit in the UI timeline and machine.
- All critical edge cases are mapped to deterministic controls and documented.
- Performance evidence includes DevTools Performance, React Profiler, and Lighthouse screenshots.

