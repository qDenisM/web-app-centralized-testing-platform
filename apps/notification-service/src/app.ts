import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { notificationsRoutes } from "./routes/notifications.routes.js";
import { preferencesRoutes } from "./routes/preferences.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";

const routes = Router();
routes.use(notificationsRoutes);
routes.use(preferencesRoutes);
routes.use(settingsRoutes);

export function buildApp() {
  return createApp({
    serviceName: "notification-service",
    logLevel: config.logLevel,
    routes,
  });
}
