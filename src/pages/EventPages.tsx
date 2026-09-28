import { useMemo, useRef, useState } from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { useHardware } from '../services/hardwareService';
import { EventRow } from '../components/widgets';
import { EmptyState, EventIcon } from '../components/ui';
import { eventModal, statusTone } from '../components/EventModal';
import { formatDay, formatShortTime, isIncident, STATUS_LABEL } from '../lib/format';
import type { SentraEvent } from '../types';
import { DemoPanel } from '../components/DemoPanel';

function Chips<T extends string>({ options, value, onChange, counts }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; counts: Record<T, number> }) {
  return (
    <div className="chips" role="group" aria-label="Filter events">
      {options.map((o) => (
        <button key={o.id} className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label} <span className="count">{counts[o.id]}</span>
        </button>
      ))}
    </div>
  );
}

// ── Live events: every message from the band ─────────────────────────────────
type LiveFilter = 'all' | 'alerts' | 'device' | 'location';
const LIVE_FILTERS: { id: LiveFilter; label: string; test: (e: SentraEvent) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'alerts', label: 'Alerts', test: (e) => isIncident(e) || e.type === 'ALERT_RESOLVED' || e.type === 'LOW_BATTERY' },
  { id: 'device', label: 'Device', test: (e) => ['DEVICE_CONNECTED', 'DEVICE_DISCONNECTED', 'HEARTBEAT'].includes(e.type) },
  { id: 'location', label: 'Location', test: (e) => e.type === 'GPS_UPDATED' },
];

export function LiveEventsPage() {
  const { events } = useHardware();
  const [filter, setFilter] = useState<LiveFilter>('all');
  const mountedAt = useRef(Date.now());
  const counts = Object.fromEntries(LIVE_FILTERS.map((f) => [f.id, events.filter(f.test).length])) as Record<LiveFilter, number>;
  const list = events.filter(LIVE_FILTERS.find((f) => f.id === filter)!.test);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Live events</h2>
          <p>Every message from the band, newest first. Select an event to see its details.</p>
        </div>
      </div>
      <div className="dash">
        <div className="card">
          <Chips options={LIVE_FILTERS} value={filter} onChange={setFilter} counts={counts} />
          {list.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={26} />} title="Nothing here yet" body="Events of this type will appear the moment the band sends them." />
          ) : (
            <ul className="feed" aria-live="polite">
              {list.map((e) => (
                <EventRow key={e.id} e={e} isNew={e.timestamp > mountedAt.current} />
              ))}
            </ul>
          )}
        </div>
        <div className="dash-rail">
          <DemoPanel />
        </div>
      </div>
    </>
  );
}

// ── Fall history: incidents only ─────────────────────────────────────────────
type FallFilter = 'all' | 'possible' | 'confirmed' | 'sos' | 'resolved';
const FALL_FILTERS: { id: FallFilter; label: string; test: (e: SentraEvent) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'possible', label: 'Possible falls', test: (e) => e.type === 'FALL_DETECTED' && e.status === 'awaiting' },
  { id: 'confirmed', label: 'Confirmed', test: (e) => e.type === 'FALL_DETECTED' && (e.status === 'confirmed' || e.status === 'contact_notified') },
  { id: 'sos', label: 'SOS', test: (e) => e.type === 'SOS_TRIGGERED' },
  { id: 'resolved', label: 'Resolved', test: (e) => e.status === 'resolved' },
];

function incidentTitle(e: SentraEvent) {
  if (e.type === 'SOS_TRIGGERED') return e.status === 'resolved' ? 'Resolved SOS' : 'SOS';
  if (e.status === 'resolved') return 'Resolved fall';
  if (e.status === 'awaiting') return 'Possible fall';
  return 'Confirmed fall';
}

export function FallEventsPage() {
  const { events, activeAlertId } = useHardware();
  const [filter, setFilter] = useState<FallFilter>('all');
  const incidents = useMemo(() => events.filter(isIncident), [events]);
  const counts = Object.fromEntries(FALL_FILTERS.map((f) => [f.id, incidents.filter(f.test).length])) as Record<FallFilter, number>;
  const list = incidents.filter(FALL_FILTERS.find((f) => f.id === filter)!.test);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Fall events</h2>
          <p>Every fall and SOS the band has reported, with what happened next.</p>
        </div>
      </div>
      <Chips options={FALL_FILTERS} value={filter} onChange={setFilter} counts={counts} />
      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ShieldCheck size={26} />} title="No emergency events" body="Your SENTRA system hasn't detected any incidents." />
        </div>
      ) : (
        <div className="incident-list">
          {list.map((e) => {
            const open = e.id === activeAlertId && e.status !== 'resolved';
            return (
              <button key={e.id} className={`card card-hover incident ${open ? 'open' : ''}`} onClick={() => eventModal.open(e.id)}>
                <div className="incident-top">
                  <EventIcon event={e} size={22} />
                  <div>
                    <h3>{incidentTitle(e)}</h3>
                    <div className="incident-when num">
                      {formatDay(e.timestamp)}, {formatShortTime(e.timestamp)}
                    </div>
                  </div>
                </div>
                {e.meta?.detail && <p style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>{e.meta.detail}.</p>}
                <div className="incident-foot">
                  <span className={`pill ${statusTone(e)}`}>
                    <span className="dot" aria-hidden="true" />
                    {STATUS_LABEL[e.status]}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} aria-hidden="true" /> {e.location ? 'Location available' : 'No location'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
