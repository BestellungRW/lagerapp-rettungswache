"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({
  label,
  compact,
}: {
  label: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const client = createClient();
    await client.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={
        compact
          ? "cursor-pointer rounded-full bg-linear-to-b from-med-600 to-med-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-btn)] transition hover:from-med-700 hover:to-med-950 disabled:opacity-50"
          : "btn"
      }
    >
      {loading ? "…" : label}
    </button>
  );
}