import type { DeviceCommand, DeviceMessage, MotionSample } from '../../types';
import type { Transport, TransportHandlers } from './types';

/**
 * Real-time transport for a backend that relays ESP32 messages over WebSocket.
 *
 * Expected frames (JSON):
 *   { "type": "FALL_DETECTED", "deviceId": "SENTRA-001", "timestamp": 1727500938000, ... }
 *   { "kind": "motion", "t": 1727500938000, "g": 1.02 }        // optional telemetry
 *
 * Outgoing frames are DeviceCommand objects.
 */
export class WebSocketTransport implements Transport {
  readonly kind = 'websocket' as const;
  private ws: WebSocket | null = null;
  private handlers: TransportHandlers | null = null;
  private retry = 0;
  private closedByUser = false;
  private reconnectTimer: number | undefined;

  constructor(private readonly url: string) {}

  connect(handlers: TransportHandlers) {
    this.handlers = handlers;
    this.closedByUser = false;
    this.open();
  }

  private open() {
    this.handlers?.onStatus?.('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.handlers?.onStatus?.('open');
    };

    ws.onmessage = (e) => {
      let data: unknown;
      try {
        data = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;
      const frame = data as Record<string, unknown>;
      if (frame.kind === 'motion') {
        this.handlers?.onMotion?.(frame as unknown as MotionSample);
      } else if (typeof frame.type === 'string') {
        this.handlers?.onMessage({ timestamp: Date.now(), ...(frame as object) } as DeviceMessage);
      }
    };

    ws.onclose = () => {
      this.handlers?.onStatus?.('closed');
      if (this.closedByUser) return;
      const delay = Math.min(15000, 1000 * 2 ** this.retry++);
      this.reconnectTimer = window.setTimeout(() => this.open(), delay);
    };
  }

  disconnect() {
    this.closedByUser = true;
    window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(command: DeviceCommand) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(command));
  }
}
