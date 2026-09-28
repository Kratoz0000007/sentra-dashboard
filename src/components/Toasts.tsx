import { useEffect, useState } from 'react';
import { BatteryLow, CheckCircle2, Info, Siren, X } from 'lucide-react';
import { hardwareService, useHardware, type Toast } from '../services/hardwareService';
import { accountStore } from '../store/accountStore';
import { eventModal } from './EventModal';

const ICON = { danger: Siren, warn: BatteryLow, safe: CheckCircle2, info: Info };
const ICON_TONE = { danger: 'danger', warn: 'warn', safe: 'safe', info: 'accent' };

/** Short two-tone chime for emergencies. Silently skipped if audio is blocked. */
function chime() {
  if (!accountStore.get().sound) return;
  try {
    const ctx = new AudioContext();
    [880, 660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.17);
    });
    window.setTimeout(() => ctx.close(), 900);
  } catch {
    /* no audio */
  }
}

export function Toasts() {
  const [items, setItems] = useState<(Toast & { leaving?: boolean })[]>([]);
  const { events } = useHardware();
  // An alert toast is stale once that alert is resolved.
  const visible = items.filter((t) => t.tone !== 'danger' || !t.eventId || events.find((e) => e.id === t.eventId)?.status !== 'resolved');

  useEffect(
    () =>
      hardwareService.onToast((t) => {
        if (t.tone === 'danger') chime();
        setItems((xs) => [t, ...xs].slice(0, 4));
        window.setTimeout(() => dismiss(t.id), t.tone === 'danger' ? 10000 : 5500);
      }),
    [],
  );

  function dismiss(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 300);
  }

  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {visible.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className={`toast ${t.tone} ${t.leaving ? 'leaving' : ''}`} role={t.tone === 'danger' ? 'alert' : 'status'}>
            <span className={`ev-icon ${ICON_TONE[t.tone]}`} aria-hidden="true">
              <Icon size={18} />
            </span>
            <div>
              <strong>{t.title}</strong>
              {t.body && <p>{t.body}</p>}
              {t.eventId && (
                <button
                  className="link-btn"
                  style={{ color: 'var(--accent)', marginTop: 4, paddingLeft: 0 }}
                  onClick={() => {
                    eventModal.open(t.eventId!);
                    dismiss(t.id);
                  }}
                >
                  View event
                </button>
              )}
            </div>
            <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
