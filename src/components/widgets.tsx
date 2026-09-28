import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Battery,
  BatteryWarning,
  Cpu,
  Clock3,
  Cable,
  MapPin,
  Move3d,
  RadioTower,
  Satellite,
  ShieldCheck,
  Volume2,
  Watch,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useHardware } from '../services/hardwareService';
import { useNow } from '../hooks/useNow';
import { ago, batteryLabel, formatCoord, formatShortTime, formatTime, isIncident, SIGNAL_LABEL } from '../lib/format';
import type { SensorId, SensorState, SentraEvent } from '../types';
import { DevicePill, EmptyState, EventIcon, Skel } from './ui';
import { LeafletMap } from './LeafletMap';
import { eventModal } from './EventModal';
import { eventTone } from '../lib/format';

// ── Device status ────────────────────────────────────────────────────────────
export function DeviceStatusCard() {
  const { device, ready } = useHardware();
  const now = useNow(1000);
  const s = device.connectionStatus;
  const copy = {
    online: `Your ${device.name} is connected and transmitting data.`,
    offline: `${device.name} stopped transmitting. Check that it's charged and within Wi-Fi range.`,
    connecting: `Looking for ${device.name}…`,
  }[s];

  return (
    <section className="card card-hover" aria-labelledby="device-status-title">
      <div className="card-head">
        <h3 className="card-title" id="device-status-title">
          <Watch size={18} aria-hidden="true" /> Device status
        </h3>
        <DevicePill status={s} />
      </div>
      {!ready && s === 'connecting' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skel w="45%" h={36} />
          <Skel w="80%" />
          <div className="stat-row">
            <Skel h={70} r={14} />
            <Skel h={70} r={14} />
            <Skel h={70} r={14} />
          </div>
        </div>
      ) : (
        <>
          <div className={`device-hero ${s}`}>
            <div>
              <h3>
                <span className="dot" aria-hidden="true" />
                {s === 'online' ? 'ONLINE' : s === 'offline' ? 'OFFLINE' : 'CONNECTING'}
              </h3>
              <p>{copy}</p>
            </div>
            <div key={device.lastHeartbeat ?? 0} className="pulse-ring beat" aria-hidden="true">
              <Watch className="band" size={36} strokeWidth={1.8} />
            </div>
          </div>
          <dl className="stat-row">
            <div className="stat">
              <dt>
                <Clock3 size={14} aria-hidden="true" /> Last signal
              </dt>
              <dd>{ago(device.lastHeartbeat, now)}</dd>
            </div>
            <div className="stat">
              <dt>
                <Battery size={14} aria-hidden="true" /> Battery
              </dt>
              <dd>{device.battery != null ? `${device.battery}%` : 'Unknown'}</dd>
            </div>
            <div className="stat">
              <dt>
                <Cable size={14} aria-hidden="true" /> Connection
              </dt>
              <dd>ESP32</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

// ── Battery ──────────────────────────────────────────────────────────────────
export function BatteryWidget() {
  const { device, ready } = useHardware();
  const now = useNow(5000);
  const pct = device.battery;
  const cells = pct == null ? 0 : Math.max(1, Math.ceil(pct / 10));
  const level = pct == null ? '' : pct < 20 ? 'low' : pct < 50 ? 'mid' : '';
  const label = batteryLabel(pct);
  const Icon = pct != null && pct < 20 ? BatteryWarning : Battery;

  return (
    <section className="card card-hover" aria-labelledby="battery-title">
      <div className="card-head">
        <h3 className="card-title" id="battery-title">
          <Icon size={18} aria-hidden="true" /> Battery
        </h3>
        {pct != null && <span className={`pill ${level === 'low' ? 'danger' : level === 'mid' ? 'warn' : 'safe'}`}>{label}</span>}
      </div>
      {!ready && pct == null ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Skel w={120} h={56} />
          <Skel h={46} r={12} />
        </div>
      ) : (
        <>
          <div className="battery-big">
            <span className="num">
              {pct ?? '--'}
              <small>%</small>
            </span>
          </div>
          <div
            className={`battery-cell ${level}`}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
            aria-label={`Battery ${pct ?? 'unknown'} percent, ${label}`}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <i key={`${i}-${cells}`} className={i < cells ? 'on' : ''} style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <div className="battery-meta">
            <span>
              Estimated status: <strong>{label}</strong>
            </span>
            <span>Updated {ago(device.lastHeartbeat, now)}</span>
          </div>
        </>
      )}
    </section>
  );
}

// ── Location ─────────────────────────────────────────────────────────────────
export function LocationCard({ tall = false }: { tall?: boolean }) {
  const { location, activeAlertId, events } = useHardware();
  const active = events.find((e) => e.id === activeAlertId);
  const danger = !!active && active.status !== 'resolved';

  return (
    <section className="card" aria-labelledby="location-title">
      <div className="card-head">
        <h3 className="card-title" id="location-title">
          <MapPin size={18} aria-hidden="true" /> Last known location
        </h3>
        {location ? (
          <span className="pill accent">
            <span className="dot" aria-hidden="true" /> Location available
          </span>
        ) : (
          <span className="pill">
            <span className="dot" aria-hidden="true" /> No GPS fix
          </span>
        )}
      </div>
      <div className={`map-wrap ${tall ? 'tall' : ''}`}>
        {location ? (
          <LeafletMap lat={location.lat} lng={location.lng} accuracy={location.accuracy} danger={danger} zoom={tall ? 17 : 16} />
        ) : (
          <EmptyState icon={<div className="radar" />} title="Location unavailable" body="Waiting for GPS signal. The map appears as soon as the band gets a fix." />
        )}
      </div>
      {location && (
        <dl className="loc-meta">
          <div>
            <dt>Last updated</dt>
            <dd>{formatShortTime(location.updatedAt)}</dd>
          </div>
          <div>
            <dt>Coordinates</dt>
            <dd>
              {formatCoord(location.lat, 'N', 'S')}
              <br />
              {formatCoord(location.lng, 'E', 'W')}
            </dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{location.accuracy ? `± ${location.accuracy} m` : 'Not reported'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

// ── Sensors ──────────────────────────────────────────────────────────────────
export const SENSORS: { id: SensorId; name: string; icon: LucideIcon; role: string }[] = [
  { id: 'esp32', name: 'ESP32', icon: Cpu, role: 'Controller and Wi-Fi' },
  { id: 'mpu6050', name: 'MPU6050', icon: Move3d, role: 'Accelerometer and gyroscope' },
  { id: 'buzzer', name: 'Buzzer', icon: Volume2, role: 'Local alarm on the band' },
  { id: 'gps', name: 'GPS', icon: Satellite, role: 'Location' },
  { id: 'sim800l', name: 'SIM800L', icon: RadioTower, role: 'SMS and calls' },
];

export function sensorView(s: SensorState, deviceOnline: boolean) {
  if (!deviceOnline) return { tone: '', label: 'No data', detail: 'Band is offline' };
  if (s.status === 'online') return { tone: 'safe', label: 'Online', detail: s.detail };
  if (s.status === 'waiting') return { tone: 'warn', label: s.detail.startsWith('Waiting for fix') ? 'Waiting for fix' : 'Waiting', detail: s.detail };
  return { tone: 'danger', label: 'Offline', detail: s.detail };
}

export function SensorTile({ id, big = false }: { id: SensorId; big?: boolean }) {
  const { device } = useHardware();
  const meta = SENSORS.find((s) => s.id === id)!;
  const v = sensorView(device.sensors[id], device.connectionStatus === 'online');
  const Icon = meta.icon;
  return (
    <div className={`sensor ${big ? 'big card-hover' : ''}`}>
      <div className="sensor-name">
        <span>{meta.name}</span>
        <Icon size={big ? 22 : 18} aria-hidden="true" />
      </div>
      <span className={`pill ${v.tone}`} style={{ justifySelf: 'start' }}>
        <span className="dot" aria-hidden="true" />
        {v.label}
      </span>
      <p>{big ? `${meta.role}. ${v.detail}.` : v.detail}</p>
    </div>
  );
}

export function SensorStrip() {
  const { device } = useHardware();
  const now = useNow(1000);
  return (
    <section className="card" aria-labelledby="sensors-title">
      <div className="card-head">
        <h3 className="card-title" id="sensors-title">
          <Cpu size={18} aria-hidden="true" /> {device.name.toUpperCase()}
        </h3>
        <span className="muted" style={{ fontSize: 13.5 }}>
          <Wifi size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Signal {SIGNAL_LABEL[device.signalStrength]}, heartbeat {ago(device.lastHeartbeat, now)}, firmware {device.firmware ?? 'unknown'}
        </span>
      </div>
      <div className="sensor-strip">
        {SENSORS.map((s) => (
          <SensorTile key={s.id} id={s.id} />
        ))}
      </div>
    </section>
  );
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export function RecentActivity({ limit = 7 }: { limit?: number }) {
  const { events } = useHardware();
  const items = events.slice(0, limit);
  return (
    <section className="card" aria-labelledby="activity-title">
      <div className="card-head">
        <h3 className="card-title" id="activity-title">
          <Clock3 size={18} aria-hidden="true" /> Recent activity
        </h3>
        <Link to="/app/events" style={{ fontSize: 14, fontWeight: 600 }}>
          See all
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={26} />} title="No activity yet" body="Events from the band will appear here as they arrive." />
      ) : (
        <ol className="timeline">
          {items.map((e) => {
            const tone = eventTone(e);
            return (
              <li key={e.id}>
                <time dateTime={new Date(e.timestamp).toISOString()}>{formatShortTime(e.timestamp)}</time>
                <span className={`tl-node ${tone}`} aria-hidden="true">
                  <i />
                </span>
                <span className={`tl-body ${tone === 'danger' ? 'danger' : ''}`}>
                  {e.type === 'FALL_DETECTED' && e.status === 'resolved' ? 'Resolved fall' : e.message}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ── Live feed ────────────────────────────────────────────────────────────────
export function EventRow({ e, isNew }: { e: SentraEvent; isNew: boolean }) {
  const { device } = useHardware();
  const tone = eventTone(e);
  const incident = isIncident(e);
  const hot = tone === 'danger';
  return (
    <li>
      <button
        type="button"
        className={`event clickable ${hot ? 'danger' : ''} ${isNew ? 'is-new' : ''}`}
        style={{ width: '100%', textAlign: 'left' }}
        onClick={() => eventModal.open(e.id)}
        aria-label={`${e.message} at ${formatTime(e.timestamp)}. Open details.`}
      >
        <EventIcon event={e} />
        <div style={{ minWidth: 0 }}>
          <div className="ev-title">
            <strong>{e.type === 'SOS_TRIGGERED' ? 'SOS BUTTON ACTIVATED' : e.type === 'FALL_DETECTED' && e.status === 'resolved' ? 'Resolved fall' : e.message}</strong>
            <span className="ev-time">{formatTime(e.timestamp)}</span>
          </div>
          {incident && (
            <>
              <div className="ev-sub">
                {device.wearer}'s {device.name}
              </div>
              <div className="ev-tags">
                {e.type === 'FALL_DETECTED' && (
                  <span className={`pill ${hot ? 'danger' : ''}`}>
                    <span className="dot" aria-hidden="true" />
                    Impact detected
                  </span>
                )}
                <span className={`pill ${e.location ? 'accent' : ''}`}>
                  <MapPin size={12} aria-hidden="true" />
                  {e.location ? 'Location available' : 'No location'}
                </span>
              </div>
              {hot && (
                <span className="btn btn-sm btn-danger ev-action" aria-hidden="true">
                  VIEW EVENT
                </span>
              )}
            </>
          )}
          {!incident && e.meta?.detail && <div className="ev-sub">{e.meta.detail}</div>}
        </div>
      </button>
    </li>
  );
}

export function LiveEventsPanel({ limit = 12, scroll = true }: { limit?: number; scroll?: boolean }) {
  const { events, ready } = useHardware();
  const mountedAt = useRef(Date.now());
  const items = events.slice(0, limit);
  return (
    <section className="card" aria-labelledby="live-title">
      <div className="card-head">
        <h3 className="card-title" id="live-title">
          <span className="pill safe live" style={{ padding: 0, background: 'none' }}>
            <span className="dot" aria-hidden="true" />
          </span>
          LIVE EVENTS
        </h3>
        <Link to="/app/events" style={{ fontSize: 14, fontWeight: 600 }}>
          History
        </Link>
      </div>
      {!ready && items.length === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <Skel w={40} h={40} r={12} />
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <Skel w="70%" />
                <Skel w="40%" h={12} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={26} />} title="No emergency events" body="Your SENTRA system hasn't detected any incidents." />
      ) : (
        <div className={scroll ? 'feed-scroll' : ''}>
          <ul className="feed" aria-live="polite" aria-relevant="additions">
            {items.map((e) => (
              <EventRow key={e.id} e={e} isNew={e.timestamp > mountedAt.current} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
