"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStationContext } from "@/lib/station-context";
import { toNonNegativeInt } from "@/lib/format";

function backTo(opts: { ok?: string; err?: string }): never {
  revalidatePath("/bestandsverzeichnis");
  const params = new URLSearchParams();
  if (opts.ok) params.set("ok", opts.ok);
  if (opts.err) params.set("err", opts.err);
  return redirect(
    "/bestandsverzeichnis" + (params.toString() ? "?" + params.toString() : "")
  );
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Einheitliches Bestandsverzeichnis (nur Admin): legt einen Artikel in
 * mehreren ausgewählten Rettungswachen an. Für jede Wache wird geprüft,
 * ob der Barcode dort bereits hinterlegt ist – solche Wachen werden
 * übersprungen und im Ergebnis genannt.
 */
export async function createSharedProduct(formData: FormData) {
  const ctx = await getStationContext();
  if (!ctx.isAdmin) return backTo({ err: "Nur der Admin darf das." });

  const name = text(formData, "name");
  const barcode = text(formData, "barcode");
  const soll = toNonNegativeInt(formData.get("soll"));
  const stationIds = new Set(
    (Array.isArray(formData.getAll("station_ids"))
      ? formData.getAll("station_ids")
      : [])
      .map((v) => String(v).trim())
      .filter(Boolean)
  );

  if (!name || !barcode) {
    return backTo({ err: "Bezeichnung und Barcode sind Pflichtfelder." });
  }
  if (stationIds.size === 0) {
    return backTo({
      err: "Bitte mindestens eine Rettungswache für das Verzeichnis auswählen.",
    });
  }

  const supabase = await createClient();

  // Welche Wachen haben den Barcode schon?
  const { data: existing } = await supabase
    .from("products")
    .select("station_id, name")
    .eq("barcode", barcode);
  const hasBarcode = new Set((existing ?? []).map((e) => e.station_id));

  const targetIds = [...stationIds].filter((id) => !hasBarcode.has(id));
  const skipIds = [...stationIds].filter((id) => hasBarcode.has(id));

  const created = [];
  const errors: string[] = [];
  for (const stationId of targetIds) {
    const { error } = await supabase
      .from("products")
      .insert({ station_id: stationId, name, barcode, soll });
    if (error) {
      if (error.code === "23505") continue; // parallel angelegt
      errors.push(error.message);
    } else {
      created.push(stationId);
    }
  }

  const stationNames = new Map<string, string>();
  const { data: stationsData } = await supabase
    .from("stations")
    .select("id, name");
  for (const s of stationsData ?? []) stationNames.set(s.id, s.name);

  const labelFor = (ids: string[]) =>
    ids
      .map((id) => stationNames.get(id) ?? id)
      .filter((n, i, arr) => n !== arr[i - 1])
      .join(", ");

  if (created.length === 0) {
    return backTo({
      err:
        "Artikel »" +
        name +
        "« wurde in keiner Wache angelegt, weil er dort bereits hinterlegt ist." +
        (skipIds.length > 0 ? " Vorhanden: " + labelFor(skipIds) + "." : ""),
    });
  }

  const okParts = [
    "Artikel »" + name + "« in " + created.length + " Rettungswache(n) angelegt (Einheitsverzeichnis).",
  ];
  if (skipIds.length > 0) {
    okParts.push(
      "Bereits vorhanden und nicht angelegt: " + labelFor(skipIds) + "."
    );
  }
  if (errors.length > 0) {
    okParts.push("Bei einigen Wachen gab es Fehler: " + errors.join("; "));
  }
  return backTo({ ok: okParts.join(" ") });
}

export async function createProduct(formData: FormData) {
  const ctx = await getStationContext();
  if (!ctx.canManage) return backTo({ err: "Keine Berechtigung." });
  if (!ctx.stationId) return backTo({ err: "Keine Rettungswache ausgewählt." });

  const name = text(formData, "name");
  const barcode = text(formData, "barcode");
  const soll = toNonNegativeInt(formData.get("soll"));

  if (!name || !barcode) {
    return backTo({ err: "Bezeichnung und Barcode sind Pflichtfelder." });
  }

  const supabase = await createClient();

  // Hinweis, falls der Artikel in dieser Wache bereits existiert
  const { data: dup } = await supabase
    .from("products")
    .select("id, name")
    .eq("station_id", ctx.stationId)
    .eq("barcode", barcode)
    .maybeSingle();
  if (dup) {
    return backTo({
      err:
        "Hinweis: Ein Artikel mit diesem Barcode existiert bereits (" +
        dup.name +
        ").",
    });
  }

  const { error } = await supabase
    .from("products")
    .insert({ station_id: ctx.stationId, name, barcode, soll });

  if (error) {
    if (error.code === "23505") {
      return backTo({
        err: "Hinweis: Dieser Barcode ist für diese Rettungswache bereits vergeben.",
      });
    }
    return backTo({ err: "Anlegen fehlgeschlagen: " + error.message });
  }
  return backTo({ ok: "Artikel »" + name + "« angelegt." });
}

export async function updateProduct(formData: FormData) {
  const ctx = await getStationContext();
  if (!ctx.canManage || !ctx.stationId) return backTo({ err: "Keine Berechtigung." });

  const id = text(formData, "id");
  const name = text(formData, "name");
  const barcode = text(formData, "barcode");
  const soll = toNonNegativeInt(formData.get("soll"));

  if (!id || !name || !barcode) {
    return backTo({ err: "Bezeichnung und Barcode sind Pflichtfelder." });
  }

  const supabase = await createClient();

  const { data: dup } = await supabase
    .from("products")
    .select("id, name")
    .eq("station_id", ctx.stationId)
    .eq("barcode", barcode)
    .neq("id", id)
    .maybeSingle();
  if (dup) {
    return backTo({
      err:
        "Hinweis: Ein anderer Artikel mit diesem Barcode existiert bereits (" +
        dup.name +
        "). Barcode ändern oder Artikel getrennt verwalten.",
    });
  }

  const { error } = await supabase
    .from("products")
    .update({ name, barcode, soll, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return backTo({
        err: "Hinweis: Dieser Barcode ist für diese Rettungswache bereits vergeben.",
      });
    }
    return backTo({ err: "Speichern fehlgeschlagen: " + error.message });
  }
  return backTo({ ok: "Artikel gespeichert." });
}

export async function deleteProduct(formData: FormData) {
  const ctx = await getStationContext();
  if (!ctx.canManage || !ctx.stationId) return backTo({ err: "Keine Berechtigung." });

  const id = text(formData, "id");
  if (!id) return backTo({ err: "Artikel nicht gefunden." });

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return backTo({ err: "Löschen fehlgeschlagen: " + error.message });
  return backTo({ ok: "Artikel gelöscht." });
}