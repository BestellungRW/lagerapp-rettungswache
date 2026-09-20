import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<{
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, station_id")
    .eq("id", user.id)
    .maybeSingle();

  return { profile: (profile as Profile | null) ?? null };
}

export async function getCurrentRole(): Promise<Role | null> {
  const { profile } = await getCurrentProfile();
  return (profile?.role as Role | null | undefined) ?? null;
}