import type { ReactNode } from 'react';
import {
  Activity,
  BatteryLow,
  CheckCircle2,
  MapPin,
  Moon,
  PlugZap,
  Siren,
  Sun,
  TriangleAlert,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import type { ConnectionStatus, EventType, SentraEvent } from '../types';
import { accountStore, useAccount } from '../store/accountStore';
import { eventTone } from '../lib/format';

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="0.5" y="0.5" width="33" height="33" rx="10" fill="#0b1733" stroke="#ffffff" strokeOpacity="0.12" />
      <circle cx="17" cy="17" r="9.5" fill="none" stroke="#6e8fff" strokeWidth="2.4" />
      <path d="M8.5 17h4.2l2.1-4.4 3.3 8.8 2.1-4.4h5.3" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-word">SENTRA</span>
    </span>
  );
}

export const EVENT_ICONS: Record<EventType, LucideIcon> = {
  FALL_DETECTED: TriangleAlert,
  SOS_TRIGGERED: Siren,
  DEVICE_CONNECTED: PlugZap,
  DEVICE_DISCONNECTED: Unplug,
  HEARTBEAT: Activity,
  LOW_BATTERY: BatteryLow,
  GPS_UPDATED: MapPin,
  ALERT_RESOLVED: CheckCircle2,
};

export function EventIcon({ event, size = 20 }: { event: Pick<SentraEvent, 'type' | 'status'>; size?: number }) {
  const Icon = event.type === 'FALL_DETECTED' && event.status === 'resolved' ? CheckCircle2 : EVENT_ICONS[event.type];
  return (
    <span className={`ev-icon ${eventTone(event)}`} aria-hidden="true">
      <Icon size={size} strokeWidth={2.1} />
    </span>
  );
}

const DEVICE_PILL: Record<ConnectionStatus, { tone: string; label: string }> = {
  online: { tone: 'safe live', label: 'Device online' },
  offline: { tone: 'danger', label: 'Device offline' },
  connecting: { tone: 'warn', label: 'Connecting' },
};

export function DevicePill({ status }: { status: ConnectionStatus }) {
  const p = DEVICE_PILL[status];
  return (
    <span className={`pill ${p.tone}`} role="status">
      <span className="dot" aria-hidden="true" />
      {p.label}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h4>{title}</h4>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Skel({ w = '100%', h = 16, r }: { w?: number | string; h?: number | string; r?: number }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}

export function ThemeToggle({ className = 'icon-btn' }: { className?: string }) {
  const { theme } = useAccount();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className={className} onClick={() => accountStore.setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </span>
  );
}

