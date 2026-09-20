import { createClient } from "@/lib/supabase/server";
import { getStationContext } from "@/lib/station-context";
import type { Product, Station } from "@/lib/types";
import ScanClient from "@/components/scan-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getStationContext();
  const supabase = await createClient();

  let products: Product[] = [];
  let stations: Station[] = [];

  if (ctx.stationId) {
    const { data } = await supabase
      .from("products")
      .select("id, station_id, barcode, name, soll")
      .eq("station_id", ctx.stationId)
      .order("name", { ascending: true });
    products = (data ?? []) as Product[];
  }

  if (ctx.isAdmin) {
    const { data } = await supabase
      .from("stations")
      .select("id, name")
      .order("name", { ascending: true });
    stations = (data ?? []) as Station[];
  }

  return (
    <ScanClient
      stationId={ctx.stationId}
      stationName={ctx.stationName}
      products={products}
      stations={stations}
      isAdmin={ctx.isAdmin}
    />
  );
}