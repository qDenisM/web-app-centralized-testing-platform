"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormButton } from "@/components/ui/FormButton";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormButton
      type="button"
      variant="secondary"
      className="w-auto px-4 py-2"
      disabled={loading}
      onClick={onLogout}
    >
      {loading ? "Выходим…" : "Выйти"}
    </FormButton>
  );
}
