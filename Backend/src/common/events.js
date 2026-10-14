import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter();
// Increase listener limit for multiple active client connections
eventBus.setMaxListeners(200);

export function emitRealtimeEvent(type, payload = {}) {
  const event = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  eventBus.emit("realtime", event);
}
