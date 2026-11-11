import { Router } from "express";
import { getJwks } from "../tokens.js";

export const jwksRoutes = Router();

jwksRoutes.get("/.well-known/jwks.json", async (_req, res, next) => {
  try {
    const jwks = await getJwks();
    res.status(200).json(jwks);
  } catch (err) {
    next(err);
  }
});

jwksRoutes.get("/jwks", async (_req, res, next) => {
  try {
    const jwks = await getJwks();
    res.status(200).json(jwks);
  } catch (err) {
    next(err);
  }
});
