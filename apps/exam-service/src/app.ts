import { Router } from "express";
import { createApp } from "@abiturent/service-kit";
import { config } from "./config.js";

const routes = Router();

export function buildApp() {
  return createApp({
    serviceName: "exam-service",
    routes,
    logLevel: config.logLevel,
  });
}
