import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";

const routes = Router();

routes.get("/analytics/health/clickhouse", async (_req, res) => {
  try {
    const auth = Buffer.from(
      `${config.clickhouse.user}:${config.clickhouse.password}`,
    ).toString("base64");
    const response = await fetch(`${config.clickhouse.url}/ping`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      res.status(503).json({ ok: false, clickhouse: "unreachable" });
      return;
    }
    res.status(200).json({ ok: true, clickhouse: "up" });
  } catch {
    res.status(503).json({ ok: false, clickhouse: "error" });
  }
});

export function buildApp() {
  return createApp({
    serviceName: "analytics-service",
    logLevel: config.logLevel,
    routes,
  });
}