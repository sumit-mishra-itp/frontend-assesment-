import { useState } from 'react';

interface DevToolsPanelProps {
  onRunCommand: (command: string) => void;
}

const COMMANDS = [
  'fail-next',
  'timeout-next',
  'invalid-response-next',
  'persist-fail-next',
  'tamper-price',
  'tamper-price:-10',
  'conflict',
  'retry-now',
  'clear-debug',
  'help',
] as const;

export const DevToolsPanel = ({ onRunCommand }: DevToolsPanelProps) => {
  const [command, setCommand] = useState<string>('');

  const runCommand = () => {
    const trimmed = command.trim();

    if (!trimmed) {
      return;
    }

    onRunCommand(trimmed);
    setCommand('');
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-cyan-900/10 backdrop-blur sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Demo Devtools</h2>
      <p className="mt-1 text-xs text-slate-600">
        Command box for deterministic demos. Examples: {COMMANDS.join(', ')}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              runCommand();
            }
          }}
          placeholder="Enter command (e.g. fail-next)"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-cyan-500 transition focus:ring-2"
        />
        <button
          type="button"
          onClick={runCommand}
          className="touch-target rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Run
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {COMMANDS.map((preset) => {
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onRunCommand(preset)}
              className="touch-target rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {preset}
            </button>
          );
        })}
      </div>
    </section>
  );
};
