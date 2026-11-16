import { NextResponse } from "next/server";
import { identityFetch } from "@/lib/identity-api";

export type MeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export async function GET() {
  const result = await identityFetch<MeUser>("/users/me");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await identityFetch<MeUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
