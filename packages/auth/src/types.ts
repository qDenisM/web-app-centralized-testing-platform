import type { Role } from "@abiturent/contracts";

export type JwtPayload = {
  /** subject = user id */
  sub: string;
  email: string;
  role: Role;
  /** JWT ID — для revoke / blacklist в Redis */
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
