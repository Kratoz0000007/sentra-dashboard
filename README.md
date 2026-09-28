# SENTRA

Stay aware. Stay connected.

SENTRA is the companion dashboard for a fall-detection wearable (ESP32 + MPU6050). It receives events from the band, shows whether the wearer is safe, and tells the caregiver what to do when a fall or SOS happens.

## Demo video

A 1-minute walkthrough: [docs/sentra-demo.mp4](docs/sentra-demo.mp4)

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with any email and password. An unknown email opens a ready-made demo account (wearer "Grandma", band `SENTRA-001`). Choose **Create account** to go through sign-up and the four-step device setup.

## Demo mode

With no backend configured, SENTRA runs a simulated band that sends the same messages the real ESP32 would. The **Demo mode** panel on the dashboard can:

| Button | What happens |
| --- | --- |
| Simulate fall | The motion trace shows a free-fall dip and an impact spike. GPS gets a fix, then `FALL_DETECTED` arrives. The dashboard switches to *Possible fall detected*, and after 30 s without a response it escalates to *Emergency* and notifies the first contact. |
| Simulate SOS | `SOS_TRIGGERED`, which goes straight to emergency. |
| Simulate device offline | Heartbeats stop and the band shows as offline. The button changes to *Reconnect device*. |
| Simulate low battery | Battery drops to 14% and `LOW_BATTERY` is logged. |

Settings has switches to hide the demo panel and to reset the demo history.

## Architecture

```
ESP32 + MPU6050 → fall detection on the band → Wi-Fi → backend → Transport → hardwareService → UI
```

- `src/types.ts`: the data model (User, Device, UserDevice, Event, EmergencyContact) and the wire format (`DeviceMessage`).
- `src/services/transport/`: how events arrive. `MockTransport` is the simulated band. `WebSocketTransport` connects to a real backend. For MQTT or Supabase Realtime, implement the same `Transport` interface.
- `src/services/hardwareService.ts`: the only thing the UI talks to. It exposes `getDeviceStatus()`, `getBatteryLevel()`, `getFallStatus()`, `getLastHeartbeat()`, `getLocation()`, `getRecentEvents()`, `triggerSOS()` and `resolveAlert()`. It also turns incoming messages into state, marks the band offline after 15 s without a heartbeat, and escalates unanswered falls.
- UI components never reference hardware directly. They subscribe to `hardwareService`, so they update the moment a message arrives.

### Connecting real hardware

1. Have your backend receive events from the ESP32 (HTTP, MQTT, …) and broadcast them over WebSocket as JSON:
   ```json
   { "type": "FALL_DETECTED", "deviceId": "SENTRA-001", "timestamp": 1790611311348, "battery": 82, "location": { "lat": 13.0827, "lng": 80.2707 }, "impactG": 3.4 }
   ```
   Supported types: `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`, `HEARTBEAT`, `FALL_DETECTED`, `SOS_TRIGGERED`, `LOW_BATTERY`, `GPS_UPDATED`, `ALERT_RESOLVED`.
   Motion telemetry is optional: `{ "kind": "motion", "t": 1790611311348, "g": 1.02 }`.
2. Copy `.env.example` to `.env` and set `VITE_SENTRA_WS_URL=ws://your-server/ws`.
3. Restart `npm run dev`. The demo panel disappears and the dashboard shows live data.

The dashboard sends commands back as JSON: `{ "type": "RESOLVE_ALERT", "eventId": "…" }` and `{ "type": "TRIGGER_SOS" }`.

## Notes

- Sign-in is mocked in `src/store/accountStore.ts`. Swap it for a real auth provider. Accounts, contacts and event history are kept in `localStorage`.
- Maps use OpenStreetMap data with CARTO tiles through Leaflet, so an internet connection is needed for map tiles.
