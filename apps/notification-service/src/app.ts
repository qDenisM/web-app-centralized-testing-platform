import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { notificationsRoutes } from "./routes/notifications.routes.js";

const routes = Router();
routes.use(notificationsRoutes);

export function buildApp() {
  return createApp({
    serviceName: "notification-service",
    logLevel: config.logLevel,
    routes,
  });
}
