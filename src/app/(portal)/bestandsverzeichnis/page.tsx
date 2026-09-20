import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStationContext } from "@/lib/station-context";
import StationPicker from "@/components/station-picker";
import type { Product, Station } from "@/lib/types";
import { createProduct, updateProduct, deleteProduct } from "./actions";
import BarcodeDruck from "./barcode-druck";

export const dynamic = "force-dynamic";

function Banner({ ok, err }: { ok?: string; err?: string }) {
  if (ok) return <p className="notice-success">{ok}</p>;
  if (err) return <p className="notice-error">{err}</p>;
  return null;
}

export default async function BestandsverzeichnisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  const ctx = await getStationContext();
  if (!ctx.canManage) redirect("/");

  if (!ctx.stationId) {
    return (
      <div className="space-y-6">
        <Banner ok={ok} err={err} />
        <section>
          <h1 className="h-section">Bestandsverzeichnis</h1>
          <p className="mt-1 text-sm text-stone-600">
            Bitte wählen Sie eine Rettungswache aus.
          </p>
        </section>
        {ctx.isAdmin && (
          <p className="notice">
            Legen Sie zuerst unter{" "}
            <a href="/benutzerverwaltung" className="font-semibold underline">
              Benutzerverwaltung
            </a>{" "}
            eine Rettungswache an.
          </p>
        )}
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: productsData }, { data: stationsData }] = await Promise.all([
    supabase
      .from("products")
      .select("id, station_id, barcode, name, soll")
      .eq("station_id", ctx.stationId)
      .order("name", { ascending: true }),
    ctx.isAdmin
      ? supabase
          .from("stations")
          .select("id, name")
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const products = (productsData ?? []) as Product[];
  const stations = (stationsData ?? []) as Station[];

  return (
    <div className="space-y-6">
      <Banner ok={ok} err={err} />

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h-section">Bestandsverzeichnis</h1>
          <p className="mt-1 text-sm text-stone-600">
            Alle Artikel der Rettungswache {ctx.stationName} · Soll-Mengen
            direkt anpassbar
          </p>
        </div>
        {ctx.isAdmin && (
          <StationPicker stations={stations} currentStationId={ctx.stationId} />
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-bold text-med-900">Neuer Artikel</h2>
        <form action={createProduct} className="mt-4 flex flex-wrap gap-2">
          <input
            name="name"
            required
            placeholder="Bezeichnung (z. B. Spritze 10 ml)"
            className="input min-w-56 flex-1"
          />
          <input
            name="barcode"
            required
            placeholder="Barcode"
            className="input min-w-40 flex-1"
          />
          <input
            name="soll"
            type="number"
            min={0}
            defaultValue={0}
            className="input w-24"
            aria-label="Soll-Menge"
          />
          <button type="submit" className="btn">
            Artikel anlegen
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold text-med-900">
          Produkte ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="notice mt-3">
            Noch keine Artikel angelegt. Legen Sie den ersten Artikel an.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {products.map((p) => (
              <form
                key={p.id}
                action={updateProduct}
                className="flex flex-wrap items-end gap-2 rounded-xl border border-med-100 bg-med-50/40 p-3"
              >
                <input type="hidden" name="id" value={p.id} />
                <div className="min-w-52 flex-1">
                  <label className="label">Bezeichnung</label>
                  <input
                    name="name"
                    defaultValue={p.name}
                    required
                    className="input"
                  />
                </div>
                <div className="min-w-36 flex-1">
                  <label className="label">Barcode</label>
                  <input
                    name="barcode"
                    defaultValue={p.barcode}
                    required
                    className="input"
                  />
                </div>
                <div className="w-24">
                  <label className="label">Soll</label>
                  <input
                    name="soll"
                    type="number"
                    min={0}
                    defaultValue={p.soll}
                    className="input"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-small">
                    Speichern
                  </button>
                  <button
                    type="submit"
                    formAction={deleteProduct}
                    className="btn btn-red btn-small"
                    formNoValidate
                  >
                    Löschen
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <BarcodeDruck products={products} stationName={ctx.stationName} />
    </div>
  );
}