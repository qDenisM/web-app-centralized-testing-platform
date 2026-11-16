import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { campaignsRoutes } from "./routes/campaigns.routes.js";
import { institutionsRoutes } from "./routes/institutions.routes.js";
import { specialtiesRoutes } from "./routes/specialties.routes.js";
import { subjectsRoutes } from "./routes/subjects.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";

const routes = Router();
routes.use(institutionsRoutes);
routes.use(subjectsRoutes);
routes.use(specialtiesRoutes);
routes.use(campaignsRoutes);
routes.use(adminRoutes);

export function buildApp() {
  return createApp({
    serviceName: "catalog-service",
    logLevel: config.logLevel,
    routes,
  });
}
