import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { applicationsRoutes } from "./routes/applications.routes.js";
import { examsRoutes } from "./routes/exams.routes.js";
import { moderatorRoutes } from "./routes/moderator.routes.js";

const routes = Router();
routes.use(examsRoutes);
routes.use(applicationsRoutes);
routes.use(moderatorRoutes);

export function buildApp() {
  return createApp({
    serviceName: "exam-service",
    routes,
    logLevel: config.logLevel,
  });
}
