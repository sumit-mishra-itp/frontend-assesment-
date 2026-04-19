import type { LogCategory, LogEntry } from '../types';
import { loadObservabilityLogs, saveObservabilityLogs } from './storage';

const MAX_LOG_ENTRIES = 500;

const buildLogEntry = (
  category: LogCategory,
  event: string,
  metadata: Record<string, unknown>,
): LogEntry => {
  return {
    id: `${Date.now()}-${Math.trunc(Math.random() * 100_000)}`,
    category,
    event,
    timestamp: new Date().toISOString(),
    metadata,
  };
};

export const logStructuredEvent = (
  category: LogCategory,
  event: string,
  metadata: Record<string, unknown> = {},
): LogEntry => {
  const entry = buildLogEntry(category, event, metadata);
  const existingLogs = loadObservabilityLogs();
  const updatedLogs = [...existingLogs, entry].slice(-MAX_LOG_ENTRIES);

  saveObservabilityLogs(updatedLogs);
  console.info('[checkout-observability]', JSON.stringify(entry));

  return entry;
};

export const getRecentLogs = (limit = 120): LogEntry[] => {
  return loadObservabilityLogs().slice(-limit);
};
