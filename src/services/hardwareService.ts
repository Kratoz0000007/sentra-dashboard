import { useSyncExternalStore } from 'react';
import type {
  Device,
  DeviceMessage,
  EventStatus,
  EventType,
  GeoLocation,
  MotionSample,
  SafetyState,
  SentraEvent,
} from '../types';
import { accountStore } from '../store/accountStore';
import { load, remove, save, uid } from '../lib/storage';
import type { Transport, TransportStatus } from './transport/types';
import { MockTransport } from './transport/mockTransport';
import { WebSocketTransport } from './transport/websocketTransport';

// ── Tunables ─────────────────────────────────────────────────────────────────
/** No heartbeat for this long ⇒ the dashboard marks the band offline itself. */
const HEARTBEAT_TIMEOUT_MS = 15_000;
/** An unanswered possible fall escalates to an emergency after this long. */
export const ESCALATE_AFTER_MS = 30_000;
/** Heartbeats arrive every few seconds; only log one to the feed this often. */
const HEARTBEAT_LOG_EVERY_MS = 60_000;
const MOTION_BUFFER = 240;
const EVENTS_KEY = 'sentra.events';
const ALERT_KEY = 'sentra.activeAlert';

export interface HardwareState {
  started: boolean;
  ready: boolean;
  transport: Transport['kind'];
  link: TransportStatus;
  device: Device;
  events: SentraEvent[]; // newest first
  activeAlertId: string | null;
  location: GeoLocation | null;
}

export type ToastTone = 'danger' | 'warn' | 'safe' | 'info';
export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
  eventId?: string;
}

export const EVENT_TITLES: Record<EventType, string> = {
  DEVICE_CONNECTED: 'Device connected',
  DEVICE_DISCONNECTED: 'Device went offline',
  HEARTBEAT: 'Device heartbeat received',
  FALL_DETECTED: 'Possible fall detected',
  SOS_TRIGGERED: 'SOS button activated',
  LOW_BATTERY: 'Battery low',
  GPS_UPDATED: 'Location updated',
  ALERT_RESOLVED: 'Alert marked as resolved',
};

function blankDevice(): Device {
  const cfg = accountStore.get().device;
  return {
    id: cfg?.id ?? 'SENTRA-001',
    name: cfg?.name ?? 'SENTRA Band',
    wearer: cfg?.wearer ?? 'Wearer',
    battery: null,
    connectionStatus: 'connecting',
    signalStrength: 'none',
    lastHeartbeat: null,
    firmware: null,
    sensors: {
      esp32: { status: 'waiting', detail: 'Waiting for device' },
      mpu6050: { status: 'waiting', detail: 'Waiting for device' },
      buzzer: { status: 'waiting', detail: 'Waiting for device' },
      gps: { status: 'waiting', detail: 'Waiting for fix' },
      sim800l: { status: 'waiting', detail: 'Waiting for device' },
    },
  };
}

function atTime(daysAgo: number, h: number, m: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** A little history so the fall log isn't empty on first launch. */
function seedEvents(deviceId: string): SentraEvent[] {
  const home = { lat: 13.0829, lng: 80.2705, accuracy: 9 };
  const now = Date.now();
  const e = (type: EventType, timestamp: number, status: EventStatus, extra: Partial<SentraEvent> = {}): SentraEvent => ({
    id: uid('evt'),
    deviceId,
    type,
    timestamp,
    message: EVENT_TITLES[type],
    location: null,
    battery: 90,
    status,
    ...extra,
  });
  const fallAt = atTime(2, 16, 32);
  return [
    e('HEARTBEAT', now - 8 * 60_000, 'info', { battery: 83 }),
    e('HEARTBEAT', now - 20 * 60_000, 'info', { battery: 83 }),
    e('DEVICE_CONNECTED', now - 50 * 60_000, 'info', { battery: 84, meta: { detail: 'Band connected over Wi-Fi' } }),
    e('ALERT_RESOLVED', atTime(2, 16, 39), 'info', { battery: 71 }),
    e('FALL_DETECTED', fallAt, 'resolved', {
      battery: 71,
      location: { ...home, updatedAt: fallAt },
      meta: { impactG: 2.8, motion: 'Sudden acceleration, then slow movement', detail: 'Stumbled in the kitchen, checked on by phone', resolvedAt: atTime(2, 16, 39) },
    }),
    e('SOS_TRIGGERED', atTime(3, 20, 20), 'contact_notified', {
      battery: 64,
      location: { ...home, updatedAt: atTime(3, 20, 20) },
      meta: { detail: 'SOS button pressed on the band', notifiedContact: 'Karthik Raman' },
    }),
  ];
}

// ── Store ────────────────────────────────────────────────────────────────────

let state: HardwareState = {
  started: false,
  ready: false,
  transport: 'mock',
  link: 'closed',
  device: blankDevice(),
  events: [],
  activeAlertId: null,
  location: null,
};

const listeners = new Set<() => void>();
const toastListeners = new Set<(t: Toast) => void>();
const motionListeners = new Set<(buf: MotionSample[]) => void>();
let motion: MotionSample[] = [];
let transport: Transport | null = null;
let tick: number | undefined;
let lastLoggedHeartbeat = 0;

function set(patch: Partial<HardwareState>) {
  state = { ...state, ...patch };
  if (patch.events) save(EVENTS_KEY, state.events.slice(0, 150));
  if ('activeAlertId' in patch) save(ALERT_KEY, state.activeAlertId);
  listeners.forEach((l) => l());
}

function toast(t: Omit<Toast, 'id'>) {
  const full = { ...t, id: uid('tst') };
  toastListeners.forEach((l) => l(full));
}

function addEvent(ev: Omit<SentraEvent, 'id' | 'deviceId' | 'message'> & { message?: string }) {
  const full: SentraEvent = { id: uid('evt'), deviceId: state.device.id, message: EVENT_TITLES[ev.type], ...ev };
  set({ events: [full, ...state.events] });
  return full;
}

function patchEvent(id: string, patch: Partial<SentraEvent>) {
  set({ events: state.events.map((e) => (e.id === id ? { ...e, ...patch, meta: { ...e.meta, ...patch.meta } } : e)) });
}

function primaryContact() {
  return accountStore.get().contacts[0] ?? null;
}

/** Reduce one message from the wearable into dashboard state. */
function handleMessage(msg: DeviceMessage) {
  const d = state.device;
  const device: Device = {
    ...d,
    battery: msg.battery ?? d.battery,
    signalStrength: msg.signal ?? d.signalStrength,
    firmware: msg.firmware ?? d.firmware,
    sensors: { ...d.sensors, ...msg.sensors },
  };
  const location: GeoLocation | null = msg.location ? { ...msg.location, updatedAt: msg.timestamp } : null;
  const base = {
    timestamp: msg.timestamp,
    battery: device.battery,
    location,
    status: 'info' as EventStatus,
    meta: { detail: msg.message, signal: device.signalStrength },
  };

  switch (msg.type) {
    case 'DEVICE_CONNECTED': {
      set({ ready: true, device: { ...device, connectionStatus: 'online', lastHeartbeat: msg.timestamp } });
      addEvent({ type: msg.type, ...base });
      lastLoggedHeartbeat = 0;
      break;
    }
    case 'HEARTBEAT': {
      set({ ready: true, device: { ...device, connectionStatus: 'online', lastHeartbeat: msg.timestamp } });
      if (msg.timestamp - lastLoggedHeartbeat >= HEARTBEAT_LOG_EVERY_MS) {
        lastLoggedHeartbeat = msg.timestamp;
        addEvent({ type: msg.type, ...base });
      }
      break;
    }
    case 'DEVICE_DISCONNECTED': {
      markOffline(msg.message ?? 'Band stopped transmitting', msg.timestamp);
      break;
    }
    case 'GPS_UPDATED': {
      set({ device: { ...device, sensors: { ...device.sensors, gps: msg.sensors?.gps ?? { status: 'online', detail: 'Fix acquired' } } }, location: location ?? state.location });
      addEvent({ type: msg.type, ...base });
      break;
    }
    case 'LOW_BATTERY': {
      set({ device });
      addEvent({ type: msg.type, ...base });
      toast({ tone: 'warn', title: `Battery at ${device.battery}%`, body: `Charge ${device.wearer}'s band soon to keep monitoring active.` });
      break;
    }
    case 'FALL_DETECTED': {
      set({ device, location: location ?? state.location });
      const ev = addEvent({
        type: msg.type,
        ...base,
        location: location ?? state.location,
        status: 'awaiting',
        meta: { ...base.meta, impactG: msg.impactG, motion: msg.motion },
      });
      set({ activeAlertId: ev.id });
      toast({ tone: 'danger', title: 'Possible fall detected', body: `${device.wearer}'s ${device.name} reported an impact.`, eventId: ev.id });
      break;
    }
    case 'SOS_TRIGGERED': {
      set({ device, location: location ?? state.location });
      const contact = primaryContact();
      const ev = addEvent({
        type: msg.type,
        ...base,
        location: location ?? state.location,
        status: contact ? 'contact_notified' : 'confirmed',
        meta: { ...base.meta, escalatedAt: msg.timestamp, notifiedContact: contact?.name },
      });
      set({ activeAlertId: ev.id });
      toast({ tone: 'danger', title: 'SOS activated', body: contact ? `${contact.name} has been notified.` : 'Add an emergency contact so someone is notified.', eventId: ev.id });
      break;
    }
    case 'ALERT_RESOLVED': {
      if (state.activeAlertId) resolveAlert(state.activeAlertId, false);
      break;
    }
  }
}

function markOffline(detail: string, timestamp = Date.now()) {
  if (state.device.connectionStatus === 'offline') return;
  set({ device: { ...state.device, connectionStatus: 'offline', signalStrength: 'none' } });
  addEvent({ type: 'DEVICE_DISCONNECTED', timestamp, battery: state.device.battery, location: null, status: 'info', meta: { detail } });
  toast({ tone: 'warn', title: 'Device offline', body: `${state.device.name} stopped sending data. Monitoring is paused until it reconnects.` });
}

function escalate(id: string) {
  const ev = state.events.find((e) => e.id === id);
  if (!ev || ev.status !== 'awaiting') return;
  const contact = primaryContact();
  patchEvent(id, { status: contact ? 'contact_notified' : 'confirmed', meta: { escalatedAt: Date.now(), notifiedContact: contact?.name } });
  toast({
    tone: 'danger',
    title: 'Emergency confirmed',
    body: contact ? `No response in time. ${contact.name} (${contact.relationship}) has been notified.` : 'No response in time. Add an emergency contact so someone is notified.',
    eventId: id,
  });
}

function onTick() {
  const d = state.device;
  if (d.connectionStatus === 'online' && d.lastHeartbeat && Date.now() - d.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
    markOffline('No heartbeat for 15 seconds');
  }
  const active = getActiveAlert();
  if (active?.status === 'awaiting' && Date.now() - active.timestamp >= ESCALATE_AFTER_MS) escalate(active.id);
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getActiveAlert(): SentraEvent | null {
  return state.events.find((e) => e.id === state.activeAlertId) ?? null;
}

export function safetyOf(alert: SentraEvent | null): SafetyState {
  if (!alert || alert.status === 'resolved') return 'clear';
  return alert.status === 'awaiting' ? 'possible_fall' : 'emergency';
}

export function resolveAlert(id = state.activeAlertId, notifyDevice = true) {
  if (!id) return;
  const ev = state.events.find((e) => e.id === id);
  if (!ev || ev.status === 'resolved') return;
  const now = Date.now();
  patchEvent(id, { status: 'resolved', meta: { resolvedAt: now } });
  addEvent({ type: 'ALERT_RESOLVED', timestamp: now, battery: state.device.battery, location: null, status: 'info', meta: { detail: `${ev.message} marked as resolved` } });
  if (state.activeAlertId === id) set({ activeAlertId: null });
  if (notifyDevice) transport?.send({ type: 'RESOLVE_ALERT', eventId: id });
  toast({ tone: 'safe', title: 'Alert resolved', body: 'SENTRA is back to normal monitoring.' });
}

export const hardwareService = {
  // Lifecycle
  start() {
    if (state.started) return;
    const url = import.meta.env.VITE_SENTRA_WS_URL as string | undefined;
    const device = blankDevice();
    transport = url ? new WebSocketTransport(url) : new MockTransport(device.id);
    const stored = load<SentraEvent[] | null>(EVENTS_KEY, null);
    set({
      started: true,
      ready: false,
      transport: transport.kind,
      device,
      events: stored ?? seedEvents(device.id),
      activeAlertId: load<string | null>(ALERT_KEY, null),
      location: null,
    });
    transport.connect({
      onMessage: handleMessage,
      onStatus: (link) => {
        set({ link });
        if (link === 'closed' && transport && state.ready) markOffline('Connection to SENTRA server lost');
      },
      onMotion: (s) => {
        motion = motion.length >= MOTION_BUFFER ? [...motion.slice(1), s] : [...motion, s];
        motionListeners.forEach((l) => l(motion));
      },
    });
    tick = window.setInterval(onTick, 1000);
  },

  stop() {
    const t = transport;
    transport = null;
    t?.disconnect();
    window.clearInterval(tick);
    motion = [];
    set({ started: false, ready: false, link: 'closed' });
  },

  // Queries (named to match the backend contract)
  getDeviceStatus: () => state.device.connectionStatus,
  getBatteryLevel: () => state.device.battery,
  getFallStatus: (): SafetyState => safetyOf(getActiveAlert()),
  getLastHeartbeat: () => state.device.lastHeartbeat,
  getLocation: () => state.location,
  getRecentEvents: (limit = 50) => state.events.slice(0, limit),
  getActiveAlert,

  // Commands
  triggerSOS() {
    transport?.send({ type: 'TRIGGER_SOS' });
  },
  resolveAlert,
  escalateNow() {
    if (state.activeAlertId) escalate(state.activeAlertId);
  },

  /** Demo controls exist only when the simulated band is in use. */
  get demo() {
    return transport instanceof MockTransport ? transport : null;
  },

  resetHistory() {
    remove(EVENTS_KEY);
    remove(ALERT_KEY);
    if (transport instanceof MockTransport) transport.resetState();
    set({ events: seedEvents(state.device.id), activeAlertId: null, location: null, device: { ...state.device, battery: 82, sensors: { ...state.device.sensors, gps: { status: 'waiting', detail: 'Waiting for fix' } } } });
    toast({ tone: 'info', title: 'Demo data reset' });
  },

  // Subscriptions
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  getSnapshot: () => state,
  onToast(l: (t: Toast) => void) {
    toastListeners.add(l);
    return () => void toastListeners.delete(l);
  },
  onMotion(l: (buf: MotionSample[]) => void) {
    motionListeners.add(l);
    l(motion);
    return () => void motionListeners.delete(l);
  },
};

export function useHardware() {
  return useSyncExternalStore(hardwareService.subscribe, hardwareService.getSnapshot);
}
