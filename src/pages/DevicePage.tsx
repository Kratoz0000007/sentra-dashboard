import { ArrowRight, Cpu, LayoutDashboard, Move3d, Server, Watch, Wifi } from 'lucide-react';
import { useHardware } from '../services/hardwareService';
import { useNow } from '../hooks/useNow';
import { ago, SIGNAL_LABEL } from '../lib/format';
import { DevicePill, EmptyState } from '../components/ui';
import { SENSORS, SensorTile } from '../components/widgets';

const FLOW = [
  { icon: Move3d, title: 'MPU6050', body: 'Measures motion 20 times a second' },
  { icon: Cpu, title: 'ESP32', body: 'Runs fall detection on the band' },
  { icon: Wifi, title: 'Wi-Fi', body: 'Sends the event the moment it happens' },
  { icon: Server, title: 'SENTRA server', body: 'Stores it and broadcasts in real time' },
  { icon: LayoutDashboard, title: 'This dashboard', body: 'Shows the alert and who to call' },
];

export function DevicePage() {
  const { device, ready, transport, started, link } = useHardware();
  const now = useNow(1000);
  const online = device.connectionStatus === 'online';

  if (started && !ready && link === 'closed') {
    return (
      <div className="card">
        <EmptyState icon={<Watch size={26} />} title="No device connected" body="Connect your SENTRA Band to begin monitoring." />
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{device.name.toUpperCase()}</h2>
          <p>
            Worn by {device.wearer}. Device ID {device.id}.
          </p>
        </div>
        <DevicePill status={device.connectionStatus} />
      </div>

      <section className="card" aria-label="Device summary" style={{ marginBottom: 22 }}>
        <div className={`device-hero ${device.connectionStatus}`}>
          <div>
            <h3>
              <span className="dot" aria-hidden="true" />
              {online ? 'ONLINE' : device.connectionStatus === 'offline' ? 'OFFLINE' : 'CONNECTING'}
            </h3>
            <p>{online ? 'All readings below are live from the band.' : 'Readings below are the last values the band reported.'}</p>
          </div>
          <div key={device.lastHeartbeat ?? 0} className="pulse-ring beat" aria-hidden="true">
            <Watch className="band" size={36} strokeWidth={1.8} />
          </div>
        </div>
        <dl className="stat-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          <div className="stat">
            <dt>Battery</dt>
            <dd>{device.battery != null ? `${device.battery}%` : 'Unknown'}</dd>
          </div>
          <div className="stat">
            <dt>Signal</dt>
            <dd>{SIGNAL_LABEL[device.signalStrength]}</dd>
          </div>
          <div className="stat">
            <dt>Last heartbeat</dt>
            <dd>{ago(device.lastHeartbeat, now)}</dd>
          </div>
          <div className="stat">
            <dt>Firmware</dt>
            <dd>{device.firmware ?? 'Unknown'}</dd>
          </div>
          <div className="stat">
            <dt>Link</dt>
            <dd>{transport === 'mock' ? 'Simulated' : 'WebSocket'}</dd>
          </div>
        </dl>
      </section>

      <h3 className="card-title" style={{ fontSize: 19, marginBottom: 14 }}>
        Hardware
      </h3>
      <div className="incident-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', marginBottom: 28 }}>
        {SENSORS.map((s) => (
          <SensorTile key={s.id} id={s.id} big />
        ))}
      </div>

      <section className="card" aria-labelledby="flow-title">
        <div className="card-head">
          <h3 className="card-title" id="flow-title">
            How an alert reaches you
          </h3>
        </div>
        <ol className="flow">
          {FLOW.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <span className="flow-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <strong>{title}</strong>
              <span>{body}</span>
              {i < FLOW.length - 1 && <ArrowRight className="flow-arrow" size={18} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18 }}>
          On the band itself, the buzzer sounds a local alarm, GPS adds the location, and the SIM800L can send an SMS when there's no Wi-Fi.
        </p>
      </section>
    </>
  );
}
