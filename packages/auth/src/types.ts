import type { Role } from "@abiturent/contracts";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  jti?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
