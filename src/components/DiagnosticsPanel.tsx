import type { TransitionHistoryEntry } from '../types';

interface DiagnosticsPanelProps {
  idempotencyKey: string | null;
  cartChecksum: string;
  cartVersion: number;
  transitionHistory: TransitionHistoryEntry[];
  onCopyDiagnostics: () => void;
  copiedAt: string | null;
}

export const DiagnosticsPanel = ({
  idempotencyKey,
  cartChecksum,
  cartVersion,
  transitionHistory,
  onCopyDiagnostics,
  copiedAt,
}: DiagnosticsPanelProps) => {
  const recentTransitions = transitionHistory.slice(-5).reverse();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Diagnostics</h2>
        <button
          type="button"
          onClick={onCopyDiagnostics}
          className="touch-target rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Copy diagnostic info
        </button>
      </header>

      <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <p className="rounded-xl bg-slate-100 p-3">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Checksum</span>
          {cartChecksum}
        </p>
        <p className="rounded-xl bg-slate-100 p-3">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Version</span>
          {cartVersion}
        </p>
        <p className="rounded-xl bg-slate-100 p-3">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Idempotency Key</span>
          {idempotencyKey ? `${idempotencyKey.slice(0, 8)}...` : 'Not active'}
        </p>
        <p className="rounded-xl bg-slate-100 p-3">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Last copied</span>
          {copiedAt ?? 'Never'}
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Recent transitions
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {recentTransitions.length === 0 ? (
            <li className="rounded-xl bg-slate-100 p-3">No transitions recorded yet.</li>
          ) : (
            recentTransitions.map((transition) => {
              return (
                <li
                  key={`${transition.at}-${transition.state}`}
                  className="rounded-xl bg-slate-100 p-3"
                >
                  <span className="block font-semibold text-slate-900">{transition.state}</span>
                  <span className="block text-xs text-slate-500">{transition.at}</span>
                  <span className="block text-xs text-slate-600">{transition.reason}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
};
