import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Phone, X } from 'lucide-react';
import { useHardware, resolveAlert } from '../services/hardwareService';
import { useAccount } from '../store/accountStore';
import { formatCoord, formatDay, formatTime, isIncident, SIGNAL_LABEL, STATUS_LABEL } from '../lib/format';
import { EventIcon } from './ui';
import { LeafletMap } from './LeafletMap';
import type { SentraEvent } from '../types';

// Tiny global store so any component can open an event.
let openId: string | null = null;
const subs = new Set<() => void>();
export const eventModal = {
  open(id: string) {
    openId = id;
    subs.forEach((s) => s());
  },
  close() {
    openId = null;
    subs.forEach((s) => s());
  },
};
const subscribe = (l: () => void) => {
  subs.add(l);
  return () => void subs.delete(l);
};

export function statusTone(e: SentraEvent) {
  if (e.status === 'resolved') return 'safe';
  if (e.status === 'awaiting') return 'warn';
  if (e.status === 'info') return '';
  return 'danger';
}

export function eventTitle(e: SentraEvent) {
  if (e.type === 'FALL_DETECTED') return 'Fall event';
  if (e.type === 'SOS_TRIGGERED') return 'SOS event';
  return e.message;
}

export function EventModal() {
  const id = useSyncExternalStore(subscribe, () => openId);
  const { events, device } = useHardware();
  const { contacts } = useAccount();
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);
  const event = events.find((e) => e.id === id) ?? null;

  useEffect(() => {
    if (!event) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && eventModal.close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  if (!event) return null;
  const incident = isIncident(event);
  const open = incident && event.status !== 'resolved';
  const contact = contacts[0];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && eventModal.close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <div className="modal-head">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <EventIcon event={event} size={22} />
            <div>
              <h2 id="event-modal-title">{eventTitle(event)}</h2>
              <p className="muted" style={{ fontSize: 14 }}>
                {device.wearer}'s {device.name}
              </p>
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={eventModal.close} aria-label="Close event details">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {incident && (
            <div>
              <span className={`pill ${statusTone(event)}`}>
                <span className="dot" aria-hidden="true" />
                {STATUS_LABEL[event.status]}
                {event.status === 'contact_notified' && event.meta?.notifiedContact ? `: ${event.meta.notifiedContact}` : ''}
              </span>
            </div>
          )}
          {event.meta?.detail && <p style={{ fontSize: 16 }}>{event.meta.detail}.</p>}

          <dl className="detail-grid">
            <div>
              <dt>Detection time</dt>
              <dd className="num">
                {formatDay(event.timestamp)}, {formatTime(event.timestamp)}
              </dd>
            </div>
            {event.type === 'FALL_DETECTED' && (
              <>
                <div>
                  <dt>Impact</dt>
                  <dd>{event.meta?.impactG ? `Detected (${event.meta.impactG.toFixed(1)} g peak)` : 'Detected'}</dd>
                </div>
                <div>
                  <dt>Movement pattern</dt>
                  <dd>{event.meta?.motion ?? 'Sudden acceleration'}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Device</dt>
              <dd>
                {device.name} ({event.deviceId})
              </dd>
            </div>
            <div>
              <dt>Battery</dt>
              <dd className="num">{event.battery != null ? `${event.battery}%` : 'Not reported'}</dd>
            </div>
            <div>
              <dt>Signal strength</dt>
              <dd>{event.meta?.signal ? SIGNAL_LABEL[event.meta.signal] : 'Not reported'}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{event.location ? 'Available' : 'Unavailable'}</dd>
            </div>
            {incident && (
              <div>
                <dt>Event status</dt>
                <dd>{STATUS_LABEL[event.status]}</dd>
              </div>
            )}
            {event.meta?.resolvedAt && (
              <div>
                <dt>Resolved at</dt>
                <dd className="num">{formatTime(event.meta.resolvedAt)}</dd>
              </div>
            )}
          </dl>

          {event.location && (
            <div>
              <div className="map-wrap" style={{ height: 220 }}>
                <LeafletMap lat={event.location.lat} lng={event.location.lng} accuracy={event.location.accuracy} danger={open} />
              </div>
              <p className="muted num" style={{ fontSize: 13.5, marginTop: 8 }}>
                {formatCoord(event.location.lat, 'N', 'S')}, {formatCoord(event.location.lng, 'E', 'W')}
                {event.location.accuracy ? `, accurate to ${event.location.accuracy} m` : ''}
              </p>
            </div>
          )}

          <div className="safety-actions" style={{ marginTop: 0 }}>
            {open && (
              <button className="btn btn-safe btn-lg" onClick={() => resolveAlert(event.id)}>
                <CheckCircle2 size={19} /> Mark as resolved
              </button>
            )}
            {open && contact && (
              <a className="btn btn-lg" href={`tel:${contact.phone.replace(/\s/g, '')}`}>
                <Phone size={18} /> Call {contact.name}
              </a>
            )}
            {event.location && (
              <button
                className="btn btn-lg"
                onClick={() => {
                  eventModal.close();
                  navigate('/app/location');
                }}
              >
                <MapPin size={18} /> View location
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
