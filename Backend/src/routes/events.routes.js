import { Router } from "express";
import { eventBus } from "../common/events.js";

export const eventsRouter = Router();

eventsRouter.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Send initial connected payload
  res.write(
    `data: ${JSON.stringify({ type: "CONNECTED", userId: req.user.id, timestamp: new Date().toISOString() })}\n\n`,
  );

  const onRealtime = (event) => {
    // Optionally filter by user role or recipient if needed, or broadcast general updates
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  eventBus.on("realtime", onRealtime);

  // Send heartbeat every 20s to prevent reverse proxy timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.off("realtime", onRealtime);
  });
});
