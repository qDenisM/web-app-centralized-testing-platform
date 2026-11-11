import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { authRoutes } from "./routes/auth.routes.js";
import { usersRoutes } from "./routes/users.routes.js";
import { jwksRoutes } from "./routes/jwks.routes.js";
import { config } from "./config.js";

const routes = Router();
routes.use(jwksRoutes);
routes.use(authRoutes);
routes.use(usersRoutes);

export function buildApp() {
  return createApp({
    serviceName: "identity-service",
    logLevel: config.logLevel,
    routes,
  });
}
