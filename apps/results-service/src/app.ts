import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { examinerRoutes } from "./routes/examiner.routes.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { resultsRoutes } from "./routes/results.routes.js";

const routes = Router();
routes.use(internalRoutes);
routes.use(examinerRoutes);
routes.use(resultsRoutes);

export function buildApp() {
  return createApp({
    serviceName: "results-service",
    routes,
    logLevel: config.logLevel,
  });
}
