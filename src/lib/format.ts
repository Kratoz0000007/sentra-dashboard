import type { EventStatus, EventType, SentraEvent, SignalStrength } from '../types';

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export const formatShortTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function formatDay(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ago(ts: number | null, now: number) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  info: 'Logged',
  awaiting: 'Awaiting response',
  confirmed: 'Emergency confirmed',
  contact_notified: 'Emergency contact notified',
  resolved: 'Resolved',
};

export const SIGNAL_LABEL: Record<SignalStrength, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  weak: 'Weak',
  none: 'No signal',
};

export function batteryLabel(pct: number | null) {
  if (pct == null) return 'Unknown';
  if (pct >= 60) return 'Good';
  if (pct >= 30) return 'Moderate';
  if (pct >= 15) return 'Low';
  return 'Charge now';
}

export type Tone = 'danger' | 'warn' | 'safe' | 'accent' | 'muted';

export function eventTone(e: Pick<SentraEvent, 'type' | 'status'>): Tone {
  if ((e.type === 'FALL_DETECTED' || e.type === 'SOS_TRIGGERED') && e.status !== 'resolved') return 'danger';
  const map: Record<EventType, Tone> = {
    FALL_DETECTED: 'safe',
    SOS_TRIGGERED: 'safe',
    DEVICE_CONNECTED: 'safe',
    DEVICE_DISCONNECTED: 'warn',
    HEARTBEAT: 'muted',
    LOW_BATTERY: 'warn',
    GPS_UPDATED: 'accent',
    ALERT_RESOLVED: 'safe',
  };
  return map[e.type];
}

export const isIncident = (e: SentraEvent) => e.type === 'FALL_DETECTED' || e.type === 'SOS_TRIGGERED';

export const formatCoord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
