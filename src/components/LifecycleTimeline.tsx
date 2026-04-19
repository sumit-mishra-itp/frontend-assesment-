import type { OrderStateValue } from '../types';

const ORDER_STATES: OrderStateValue[] = [
  'CART_READY',
  'CHECKOUT_VALIDATED',
  'ORDER_SUBMITTED',
  'ORDER_SUCCESS',
  'ORDER_FAILED',
  'ORDER_INCONSISTENT',
  'ROLLED_BACK',
];

interface LifecycleTimelineProps {
  currentState: OrderStateValue;
}

const stateStatus = (
  currentState: OrderStateValue,
  candidateState: OrderStateValue,
): 'complete' | 'active' | 'idle' => {
  if (candidateState === currentState) {
    return 'active';
  }

  const activeIndex = ORDER_STATES.indexOf(currentState);
  const candidateIndex = ORDER_STATES.indexOf(candidateState);

  if (candidateIndex >= 0 && activeIndex >= 0 && candidateIndex < activeIndex) {
    return 'complete';
  }

  return 'idle';
};

const stateClasses: Record<'complete' | 'active' | 'idle', string> = {
  complete: 'bg-emerald-500 text-white border-emerald-500',
  active: 'bg-amber-500 text-slate-900 border-amber-500',
  idle: 'bg-white text-slate-700 border-slate-300',
};

export const LifecycleTimeline = ({ currentState }: LifecycleTimelineProps) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Order Lifecycle</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 sm:text-sm">
          {currentState}
        </span>
      </header>

      <ol className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-2">
        {ORDER_STATES.map((state) => {
          const status = stateStatus(currentState, state);

          return (
            <li key={state} className="relative flex items-start gap-3 md:flex-1 md:flex-col md:items-center">
              <span
                className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs font-semibold ${stateClasses[status]}`}
              >
                {ORDER_STATES.indexOf(state) + 1}
              </span>
              <p className="text-xs font-medium text-slate-700 md:text-center">{state}</p>
              <span className="absolute left-3 top-7 h-6 w-px bg-slate-200 md:left-auto md:top-3 md:h-px md:w-full" />
            </li>
          );
        })}
      </ol>
    </section>
  );
};
