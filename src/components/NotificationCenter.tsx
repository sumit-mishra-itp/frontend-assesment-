import type { NotificationItem } from '../types';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  liveMessage: string;
  onDismiss: (id: string) => void;
}

const levelClasses: Record<NotificationItem['level'], string> = {
  info: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export const NotificationCenter = ({
  notifications,
  liveMessage,
  onDismiss,
}: NotificationCenterProps) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Queue: {notifications.length}
        </span>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      {notifications.length === 0 ? (
        <p className="text-sm text-slate-600">No active notifications.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            return (
              <li
                key={notification.id}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-3 text-sm ${levelClasses[notification.level]}`}
              >
                <div>
                  <p className="font-semibold uppercase tracking-wide">{notification.level}</p>
                  <p className="mt-1 break-words">{notification.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(notification.id)}
                  className="touch-target rounded-lg border border-current px-3 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
