import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export interface StationContext {
  role: Role | null;
  email: string;
  profileId: string;
  stationId: string | null;
  stationName: string;
  isAdmin: boolean;
  canManage: boolean;
}

export async function getStationContext(): Promise<StationContext> {
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

  const role = (profile?.role as Role | null | undefined) ?? null;
  const fixedStationId = profile?.station_id ?? null;

  let stationId: string | null = null;
  let stationName = "";

  if (fixedStationId) {
    const { data: st } = await supabase
      .from("stations")
      .select("name")
      .eq("id", fixedStationId)
      .maybeSingle();
    stationId = fixedStationId;
    stationName = st?.name ?? "";
  } else if (role === "admin") {
    const cookieStore = await cookies();
    const pref = cookieStore.get("rw_station")?.value;
    if (pref) {
      const { data: st } = await supabase
        .from("stations")
        .select("name")
        .eq("id", pref)
        .maybeSingle();
      if (st) {
        stationId = pref;
        stationName = st.name;
      }
    }
    if (!stationId) {
      const { data: first } = await supabase
        .from("stations")
        .select("id, name")
        .order("name")
        .limit(1);
      stationId = first?.[0]?.id ?? null;
      stationName = first?.[0]?.name ?? "";
    }
  }

  return {
    role,
    email: profile?.email ?? user.email ?? "",
    profileId: profile?.id ?? user.id,
    stationId,
    stationName,
    isAdmin: role === "admin",
    canManage: role === "admin" || role === "mpg",
  };
}