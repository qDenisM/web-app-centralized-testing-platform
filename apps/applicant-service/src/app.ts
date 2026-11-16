import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { profilesRoutes } from "./routes/profiles.routes.js";

const routes = Router();
routes.use(profilesRoutes);

export function buildApp() {
  return createApp({
    serviceName: "applicant-service",
    logLevel: config.logLevel,
    routes,
  });
}
