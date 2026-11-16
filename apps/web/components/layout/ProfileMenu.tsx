"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ProfileMenuLink = {
  href: string;
  label: string;
  icon?: "profile" | "favorites";
};

type MeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
};

type ProfileMenuProps = {
  roleName: string;
  links: ProfileMenuLink[];
};

function shortFio(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Пользователь";
  if (parts.length === 1) return parts[0];
  const [last, first, middle] = parts;
  const initials = [first, middle]
    .filter(Boolean)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
  return `${last} ${initials}`.trim();
}

function initialsFrom(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "П").toUpperCase();
}

function displayId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
  }
  return id.slice(0, 8);
}

function MenuIcon({ kind }: { kind?: ProfileMenuLink["icon"] }) {
  if (kind === "favorites") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

export function ProfileMenu({ roleName, links }: ProfileMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = (await res.json().catch(() => null)) as
        | (MeUser & { error?: string })
        | null;
      if (!res.ok || !data || !data.id || !data.fullName) {
        setUser(null);
        return;
      }
      setUser({
        id: data.id,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone ?? null,
        role: data.role,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const fullName = user?.fullName || roleName;
  const shortName = shortFio(fullName);
  const initials = initialsFrom(fullName);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-[12px] border px-2.5 py-1.5 transition-colors",
          open
            ? "border-brand-500 bg-brand-100/50"
            : "border-border bg-white hover:bg-[#f8fafc]",
        )}
      >
        <div className="hidden text-right sm:block">
          <div className="text-sm font-bold leading-tight text-text-primary">
            {shortName}
          </div>
          <div className="text-xs text-text-muted">{roleName}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-900">
          {initials}
        </div>
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_16px_40px_-8px_rgba(11,58,74,0.18)]">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-extrabold text-text-primary">{fullName}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef2f5] px-2.5 py-0.5 text-xs font-semibold text-brand-900">
                {roleName}
              </span>
              {user?.id ? (
                <span className="text-xs text-text-muted">ID: {displayId(user.id)}</span>
              ) : null}
            </div>
            {user?.email ? (
              <div className="mt-1 truncate text-xs text-text-muted">{user.email}</div>
            ) : null}
          </div>

          {links.length > 0 ? (
            <div className="border-b border-border py-1.5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-[#f4f7f9] hover:text-brand-900"
                >
                  <MenuIcon kind={link.icon} />
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="py-1.5">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void onLogout()}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#9a3b2f] hover:bg-[#fdecec] disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              {loggingOut ? "Выходим…" : "Выйти из аккаунта"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
