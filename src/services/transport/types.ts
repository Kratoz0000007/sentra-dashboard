import type { DeviceCommand, DeviceMessage, MotionSample } from '../../types';

export type TransportStatus = 'connecting' | 'open' | 'closed';

export interface TransportHandlers {
  onMessage: (msg: DeviceMessage) => void;
  onMotion?: (sample: MotionSample) => void;
  onStatus?: (status: TransportStatus) => void;
}

/**
 * A Transport is the only thing that knows how events reach the dashboard.
 * Swap MockTransport for WebSocketTransport (or an MQTT / Supabase Realtime
 * implementation of this same interface) without touching any UI.
 */
export interface Transport {
  readonly kind: 'mock' | 'websocket' | 'mqtt' | 'supabase';
  connect(handlers: TransportHandlers): void;
  disconnect(): void;
  send(command: DeviceCommand): void;
}
