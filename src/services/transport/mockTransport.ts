import type { DeviceCommand, DeviceMessage, EventType, SensorId, SensorState, SignalStrength } from '../../types';
import type { Transport, TransportHandlers } from './types';

const HEARTBEAT_MS = 3000;
const MOTION_HZ = 20;
const HOME = { lat: 13.0827, lng: 80.2707 };

/**
 * A software stand-in for the ESP32 + MPU6050 band. It speaks exactly the
 * same DeviceMessage protocol a real backend would, so the demo exercises
 * the production code path end to end.
 */
export class MockTransport implements Transport {
  readonly kind = 'mock' as const;
  private handlers: TransportHandlers | null = null;
  private heartbeatTimer: number | undefined;
  private motionTimer: number | undefined;
  private timers: number[] = [];

  private online = false;
  private battery = 82;
  private signal: SignalStrength = 'excellent';
  private gpsFix = false;
  /** Scripted accelerometer overrides, consumed by the motion loop. */
  private motionScript: number[] = [];

  constructor(private readonly deviceId: string) {}

  connect(handlers: TransportHandlers) {
    this.handlers = handlers;
    handlers.onStatus?.('connecting');
    this.later(900, () => {
      handlers.onStatus?.('open');
      this.bringOnline();
    });
  }

  disconnect() {
    this.stopStreams();
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    this.handlers?.onStatus?.('closed');
    this.handlers = null;
  }

  send(command: DeviceCommand) {
    if (command.type === 'TRIGGER_SOS') this.emit('SOS_TRIGGERED', { message: 'SOS requested from the dashboard' });
    // RESOLVE_ALERT / SILENCE_BUZZER: the real band stops its buzzer. Nothing to echo.
  }

  // ── Demo controls ──────────────────────────────────────────────────────────

  simulateFall() {
    if (!this.online) this.bringOnline();
    // Free-fall dip → impact spike → stillness, sampled at MOTION_HZ.
    this.motionScript = [
      0.9, 0.6, 0.35, 0.2, 0.15, 0.18, 0.3, // free fall (~350 ms)
      2.1, 3.6, 2.4, 1.6, 0.7, 1.3, 0.9, // impact
      1.05, 0.98, 1.0, 1.01, 0.99, 1.0, 1.0, 1.0, 1.0, 1.0, // lying still
    ];
    this.later(1250, () => {
      this.gpsFix = true;
      const location = this.jitter(HOME);
      this.emit('GPS_UPDATED', { location, sensors: { gps: { status: 'online', detail: 'Fix from 7 satellites' } } });
      this.later(150, () =>
        this.emit('FALL_DETECTED', {
          location,
          impactG: 3.6,
          motion: 'Sudden acceleration, then no movement',
          message: 'Unusual movement followed by a possible impact',
        }),
      );
    });
  }

  simulateSOS() {
    if (!this.online) this.bringOnline();
    this.motionScript = [1.4, 1.8, 1.3, 1.6, 1.1];
    this.later(300, () =>
      this.emit('SOS_TRIGGERED', {
        location: this.gpsFix ? this.jitter(HOME) : undefined,
        message: 'SOS button pressed on the band',
      }),
    );
  }

  simulateOffline() {
    if (!this.online) return;
    this.online = false;
    this.signal = 'none';
    this.stopStreams();
    this.emit('DEVICE_DISCONNECTED', { message: 'Band stopped transmitting' });
  }

  simulateReconnect() {
    if (!this.online) this.bringOnline();
  }

  simulateLowBattery() {
    if (!this.online) this.bringOnline();
    this.battery = 14;
    this.emit('LOW_BATTERY', { message: 'Battery below 15%. Charge the band soon.' });
  }

  resetState() {
    this.battery = 82;
    this.gpsFix = false;
    this.motionScript = [];
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private bringOnline() {
    this.online = true;
    this.signal = 'excellent';
    this.emit('DEVICE_CONNECTED', {
      firmware: 'v1.0.0',
      sensors: this.sensorReport(),
      message: 'Band connected over Wi-Fi',
    });
    this.startStreams();
  }

  private sensorReport(): Partial<Record<SensorId, SensorState>> {
    return {
      esp32: { status: 'online', detail: 'Running normally' },
      mpu6050: { status: 'online', detail: 'Sensing motion' },
      buzzer: { status: 'online', detail: 'Ready to sound' },
      gps: this.gpsFix
        ? { status: 'online', detail: 'Fix acquired' }
        : { status: 'waiting', detail: 'Waiting for fix' },
      sim800l: { status: 'offline', detail: 'No SIM network' },
    };
  }

  private startStreams() {
    this.stopStreams();
    this.heartbeatTimer = window.setInterval(() => {
      // Battery drains slowly while the demo runs.
      if (Math.random() < 0.04 && this.battery > 5) this.battery -= 1;
      this.emit('HEARTBEAT', {});
    }, HEARTBEAT_MS);

    let phase = 0;
    this.motionTimer = window.setInterval(() => {
      phase += 1;
      const scripted = this.motionScript.shift();
      // Resting wrist: ~1 g with gentle arm sway and sensor noise.
      const g = scripted ?? 1 + Math.sin(phase / 9) * 0.035 + Math.sin(phase / 2.7) * 0.015 + (Math.random() - 0.5) * 0.03;
      this.handlers?.onMotion?.({ t: Date.now(), g });
    }, 1000 / MOTION_HZ);
  }

  private stopStreams() {
    window.clearInterval(this.heartbeatTimer);
    window.clearInterval(this.motionTimer);
  }

  private emit(type: EventType, extra: Partial<DeviceMessage>) {
    this.handlers?.onMessage({
      type,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      battery: this.battery,
      signal: this.signal,
      ...extra,
    });
  }

  private jitter(p: { lat: number; lng: number }) {
    return {
      lat: +(p.lat + (Math.random() - 0.5) * 0.0006).toFixed(5),
      lng: +(p.lng + (Math.random() - 0.5) * 0.0006).toFixed(5),
      accuracy: 6 + Math.round(Math.random() * 6),
    };
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }
}
