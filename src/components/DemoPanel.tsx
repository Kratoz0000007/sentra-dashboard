import { BatteryLow, FlaskConical, Plug, Siren, TriangleAlert, Unplug } from 'lucide-react';
import { hardwareService, useHardware } from '../services/hardwareService';
import { useAccount } from '../store/accountStore';

/**
 * Drives the simulated band so the full alert flow can be shown without
 * anyone actually falling. Only rendered when the mock transport is active.
 */
export function DemoPanel() {
  const { device, transport } = useHardware();
  const { demoMode } = useAccount();
  const demo = hardwareService.demo;
  if (transport !== 'mock' || !demoMode || !demo) return null;
  const offline = device.connectionStatus === 'offline';

  return (
    <section className="demo" aria-labelledby="demo-title">
      <div className="demo-head">
        <span className="demo-tag" id="demo-title">
          <FlaskConical size={13} aria-hidden="true" /> DEMO MODE
        </span>
      </div>
      <p>These buttons send the same messages the real ESP32 would. Use them to show the alert flow without a physical fall.</p>
      <div className="demo-grid">
        <button className="btn fall" onClick={() => demo.simulateFall()}>
          <TriangleAlert size={18} aria-hidden="true" /> SIMULATE FALL
        </button>
        <button className="btn" onClick={() => demo.simulateSOS()}>
          <Siren size={17} aria-hidden="true" /> SIMULATE SOS
        </button>
        <button className="btn" onClick={() => demo.simulateLowBattery()}>
          <BatteryLow size={17} aria-hidden="true" /> SIMULATE LOW BATTERY
        </button>
        {offline ? (
          <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => demo.simulateReconnect()}>
            <Plug size={17} aria-hidden="true" /> RECONNECT DEVICE
          </button>
        ) : (
          <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => demo.simulateOffline()}>
            <Unplug size={17} aria-hidden="true" /> SIMULATE DEVICE OFFLINE
          </button>
        )}
      </div>
    </section>
  );
}
