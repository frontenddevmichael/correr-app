import type { AnalyticsEvent } from './domain';

export interface AnalyticsEntry {
  event: AnalyticsEvent;
  properties?: Record<string, string | number | boolean>;
  at: string;
}

type Sink = (entry: AnalyticsEntry) => void;

const buffer: AnalyticsEntry[] = [];
const sinks: Sink[] = [];

/** Console sink (dev). PostHog sink plugs in here later without touching callers. */
const consoleSink: Sink = (entry) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[analytics] ${entry.event}`, entry.properties ?? {});
  }
};

sinks.push(consoleSink);

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
) {
  const entry: AnalyticsEntry = {
    event,
    properties,
    at: new Date().toISOString(),
  };
  buffer.push(entry);
  for (const sink of sinks) sink(entry);
}

export function addSink(sink: Sink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

export function getBufferedEvents(): readonly AnalyticsEntry[] {
  return buffer;
}
