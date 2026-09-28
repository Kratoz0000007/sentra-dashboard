// ── SENTRA data model ────────────────────────────────────────────────────────
// Mirrors the backend schema so the mock and a real API are interchangeable.

export type EventType =
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'HEARTBEAT'
  | 'FALL_DETECTED'
  | 'SOS_TRIGGERED'
  | 'LOW_BATTERY'
  | 'GPS_UPDATED'
  | 'ALERT_RESOLVED';

export type ConnectionStatus = 'online' | 'offline' | 'connecting';
export type SignalStrength = 'excellent' | 'good' | 'fair' | 'weak' | 'none';
export type SafetyState = 'clear' | 'possible_fall' | 'emergency';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number; // metres
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
}

export type SensorId = 'esp32' | 'mpu6050' | 'buzzer' | 'gps' | 'sim800l';

export interface SensorState {
  status: 'online' | 'waiting' | 'offline';
  detail: string;
}

export interface Device {
  id: string;
  name: string;
  wearer: string;
  battery: number | null;
  connectionStatus: ConnectionStatus;
  signalStrength: SignalStrength;
  lastHeartbeat: number | null;
  firmware: string | null;
  sensors: Record<SensorId, SensorState>;
}

export interface UserDevice {
  userId: string;
  deviceId: string;
}

export type EventStatus =
  | 'info'
  | 'awaiting'
  | 'confirmed'
  | 'contact_notified'
  | 'resolved';

export interface SentraEvent {
  id: string;
  deviceId: string;
  type: EventType;
  timestamp: number;
  message: string;
  location: GeoLocation | null;
  battery: number | null;
  status: EventStatus;
  meta?: {
    detail?: string;
    impactG?: number;
    motion?: string;
    signal?: SignalStrength;
    resolvedAt?: number;
    escalatedAt?: number;
    notifiedContact?: string;
  };
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
}

// ── Wire format ──────────────────────────────────────────────────────────────
// What the ESP32 (via the backend) broadcasts. Every field except type,
// deviceId and timestamp is optional — the device only sends what it knows.
export interface DeviceMessage {
  type: EventType;
  deviceId: string;
  timestamp: number;
  battery?: number;
  signal?: SignalStrength;
  firmware?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  impactG?: number;
  motion?: string;
  message?: string;
  sensors?: Partial<Record<SensorId, SensorState>>;
}

// Optional high-rate telemetry: acceleration magnitude from the MPU6050 in g.
export interface MotionSample {
  t: number;
  g: number;
}

// Commands the dashboard can send back down to the wearable.
export type DeviceCommand =
  | { type: 'TRIGGER_SOS' }
  | { type: 'RESOLVE_ALERT'; eventId: string }
  | { type: 'SILENCE_BUZZER' };
