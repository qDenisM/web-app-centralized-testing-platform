import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";
import { chancesRoutes } from "./routes/chances.routes.js";
import { favoritesRoutes } from "./routes/favorites.routes.js";

const routes = Router();
routes.use(favoritesRoutes);
routes.use(chancesRoutes);

export function buildApp() {
  return createApp({
    serviceName: "chances-service",
    logLevel: config.logLevel,
    routes,
  });
}