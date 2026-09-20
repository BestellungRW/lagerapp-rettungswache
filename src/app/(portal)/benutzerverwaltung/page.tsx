import { redirect } from "next/navigation";
import { getStationContext } from "@/lib/station-context";
import { getServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import type { Profile, Station } from "@/lib/types";
import BenutzerverwaltungClient, {
  type StationWithData,
} from "./benutzerverwaltung-client";
import { createStation } from "./actions";

export const dynamic = "force-dynamic";

function Banner({ ok, err }: { ok?: string; err?: string }) {
  if (ok) return <p className="notice-success">{ok}</p>;
  if (err) return <p className="notice-error">{err}</p>;
  return null;
}

export default async function BenutzerverwaltungPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  const ctx = await getStationContext();
  if (!ctx.isAdmin) redirect("/");

  if (!isServiceRoleConfigured()) {
    return (
      <div className="space-y-6">
        <Banner ok={ok} err={err} />
        <h1 className="h-section">Benutzerverwaltung</h1>
        <p className="notice-error">
          SUPABASE_SERVICE_ROLE_KEY ist in .env.local nicht konfiguriert. Nur
          damit kann die Benutzerverwaltung Accounts anlegen.
        </p>
      </div>
    );
  }

  const service = getServiceClient();
  const [{ data: stationsData }, { data: profilesData }, { data: recipientsData }] =
    await Promise.all([
      service.from("stations").select("id, name").order("name"),
      service.from("profiles").select("id, email, role, station_id").order("email"),
      service
        .from("order_email_recipients")
        .select("id, email, station_id")
        .order("email"),
    ]);

  const stations = (stationsData ?? []) as Station[];
  const profiles = (profilesData ?? []) as Profile[];
  const recipients = (recipientsData ?? []) as {
    id: string;
    email: string;
    station_id: string;
  }[];

  const admins = profiles.filter((p) => p.role === "admin");

  const stationsWithData: StationWithData[] = stations.map((s) => ({
    ...s,
    users: profiles.filter(
      (p) =>
        (p.role === "benutzer" || p.role === "mpg") && p.station_id === s.id
    ),
    recipients: recipients.filter((r) => r.station_id === s.id),
  }));

  const initialStationId =
    typeof sp.station === "string" &&
    stationsWithData.some((s) => s.id === sp.station)
      ? sp.station
      : stationsWithData[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <Banner ok={ok} err={err} />

      <section>
        <h1 className="h-section">Benutzerverwaltung</h1>
        <p className="mt-1 text-sm text-stone-600">
          Klicken Sie auf eine Rettungswache, um ihre Benutzer, MPG-Konten und
          Bestelllisten-Empfänger zu verwalten.
        </p>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-med-900">
            Rettungswachen ({stations.length})
          </h2>
          <form action={createStation} className="flex gap-2">
            <input
              name="name"
              required
              placeholder="Neue Rettungswache …"
              className="input min-w-52"
            />
            <button type="submit" className="btn">
              Anlegen
            </button>
          </form>
        </div>
        {stationsWithData.length === 0 && (
          <p className="notice mt-3">
            Noch keine Rettungswache angelegt. Legen Sie die erste an – die
            Wachen erscheinen dann hier untereinander.
          </p>
        )}
      </section>

      <BenutzerverwaltungClient
        stations={stationsWithData}
        admins={admins}
        initialStationId={initialStationId}
      />
    </div>
  );
}