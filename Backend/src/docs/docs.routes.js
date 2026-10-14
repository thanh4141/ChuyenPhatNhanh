import { Router, static as serveStatic } from "express";
import swaggerUi from "swagger-ui-dist";
import { fileURLToPath } from "node:url";
import { openapi } from "./openapi.js";

export const docsRouter = Router();
docsRouter.get("/openapi.json", (req, res) =>
  res.set("Cache-Control", "no-store").json(openapi),
);
docsRouter.use(
  "/assets",
  serveStatic(swaggerUi.getAbsoluteFSPath(), { index: false }),
);
docsRouter.use(
  serveStatic(fileURLToPath(new URL("./public/", import.meta.url))),
);
