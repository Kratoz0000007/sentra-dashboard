import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, MapPin, Phone, ShieldCheck, Siren, TriangleAlert, WifiOff } from 'lucide-react';
import { ESCALATE_AFTER_MS, getActiveAlert, hardwareService, resolveAlert, safetyOf, useHardware } from '../services/hardwareService';
import { useAccount } from '../store/accountStore';
import { useNow } from '../hooks/useNow';
import { ago, formatTime } from '../lib/format';
import { MotionTrace } from './MotionTrace';
import { eventModal } from './EventModal';
import { Skel } from './ui';

export function SafetyHero() {
  const hw = useHardware();
  const { contacts } = useAccount();
  const now = useNow(1000);
  const navigate = useNavigate();
  const alert = getActiveAlert();
  const safety = safetyOf(alert);
  const { device } = hw;
  const offline = device.connectionStatus === 'offline';
  const contact = contacts[0];

  if (!hw.ready && safety === 'clear') {
    return (
      <section className="safety" aria-busy="true" aria-label="Safety status loading">
        <div className="safety-top">
          <Skel w={96} h={96} r={48} />
          <div style={{ display: 'grid', gap: 12 }}>
            <Skel w={140} h={22} r={99} />
            <Skel w="55%" h={48} />
            <Skel w="70%" h={18} />
          </div>
        </div>
        <div style={{ height: 136 }} />
      </section>
    );
  }

  // ── Normal monitoring ──────────────────────────────────────────────────────
  if (!alert || safety === 'clear') {
    const paused = offline;
    return (
      <section className={`safety ${paused ? 'paused' : 'clear'}`} aria-labelledby="safety-word">
        <div className="safety-top">
          <div className="safety-medal" aria-hidden="true">
            {paused ? <WifiOff size={42} strokeWidth={2} /> : <ShieldCheck size={44} strokeWidth={2} />}
          </div>
          <div>
            <div className="safety-kicker">
              <span className={`pill ${paused ? 'warn' : 'safe live'}`}>
                <span className="dot" aria-hidden="true" />
                {paused ? 'Monitoring paused' : `Monitoring ${device.wearer}`}
              </span>
            </div>
            <h2 id="safety-word" className="safety-word">
              {paused ? 'NO SIGNAL' : '✓ ALL CLEAR'}
            </h2>
            <p className="safety-sub">
              {paused
                ? `SENTRA can't confirm ${device.wearer} is safe while the band is offline. Last heartbeat ${ago(device.lastHeartbeat, now)}.`
                : 'No emergency events detected. The band is watching for falls and SOS presses.'}
            </p>
          </div>
        </div>
        <MotionTrace offline={offline} />
      </section>
    );
  }

  // ── Active alert ───────────────────────────────────────────────────────────
  const isSOS = alert.type === 'SOS_TRIGGERED';
  const escalated = safety === 'emergency';
  const remaining = Math.max(0, Math.ceil((alert.timestamp + ESCALATE_AFTER_MS - now) / 1000));
  const word = isSOS ? '🚨 SOS ACTIVATED' : escalated ? '🚨 EMERGENCY' : '⚠ POSSIBLE FALL DETECTED';
  const sub = isSOS
    ? `${device.wearer} pressed the SOS button on the band.`
    : escalated
      ? 'Emergency alert triggered. No one marked the fall as resolved in time.'
      : 'SENTRA detected unusual movement followed by a possible impact.';

  return (
    <section className={`safety ${escalated ? 'emergency' : 'fall active-fall'}`} aria-labelledby="safety-word">
      <div className="safety-top">
        <div className="safety-medal" aria-hidden="true">
          {isSOS || escalated ? <Siren size={44} strokeWidth={2} /> : <TriangleAlert size={44} strokeWidth={2} />}
        </div>
        <div>
          <div className="safety-kicker">
            <span className={`pill ${escalated ? 'danger' : 'warn'}`}>
              <span className="dot" aria-hidden="true" />
              {alert.status === 'contact_notified' ? `${alert.meta?.notifiedContact ?? 'Emergency contact'} notified` : escalated ? 'Emergency confirmed' : 'Awaiting response'}
            </span>
          </div>
          <h2 id="safety-word" className="safety-word">
            {word}
          </h2>
          <p className="safety-sub">{sub}</p>
        </div>
      </div>

      <dl className="safety-details">
        <div>
          <dt>User</dt>
          <dd>{device.wearer}</dd>
        </div>
        <div>
          <dt>Device</dt>
          <dd>{device.name}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd className="num">{formatTime(alert.timestamp)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{alert.location ? 'Available' : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Battery</dt>
          <dd className="num">{alert.battery != null ? `${alert.battery}%` : 'Unknown'}</dd>
        </div>
      </dl>

      {!escalated && (
        <div className="escalation" role="timer" aria-live="off">
          <div className="escalation-row">
            <span>
              {contact ? (
                <>
                  Notifying <strong>{contact.name}</strong> in <strong className="num">{remaining}s</strong> unless resolved
                </>
              ) : (
                <>
                  Escalating to emergency in <strong className="num">{remaining}s</strong> unless resolved
                </>
              )}
            </span>
            <button className="link-btn" onClick={() => hardwareService.escalateNow()}>
              Escalate now
            </button>
          </div>
          <div className="escalation-bar" aria-hidden="true">
            <span style={{ width: `${(remaining / (ESCALATE_AFTER_MS / 1000)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="safety-actions">
        <button className="btn btn-lg" onClick={() => navigate('/app/location')} disabled={!alert.location}>
          <MapPin size={19} /> View location
        </button>
        {contact ? (
          <a className="btn btn-danger btn-lg" href={`tel:${contact.phone.replace(/\s/g, '')}`}>
            <Phone size={19} /> Call {contact.name}
          </a>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={() => navigate('/app/contacts')}>
            <Phone size={19} /> Add emergency contact
          </button>
        )}
        <button className="btn btn-safe btn-lg" onClick={() => resolveAlert(alert.id)}>
          <CheckCircle2 size={19} /> Mark as resolved
        </button>
        <button className="btn btn-ghost btn-lg" onClick={() => eventModal.open(alert.id)}>
          <FileText size={19} /> Event details
        </button>
      </div>

      <MotionTrace offline={offline} impact={alert.meta?.impactG ? { g: alert.meta.impactG, at: formatTime(alert.timestamp) } : undefined} />
    </section>
  );
}
