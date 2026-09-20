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
  const { error } = await supabase
    .from("products")
    .insert({ station_id: ctx.stationId, name, barcode, soll });

  if (error) {
    if (error.code === "23505") {
      return backTo({
        err: "Dieser Barcode ist für diese Rettungswache bereits vergeben.",
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
  const { error } = await supabase
    .from("products")
    .update({ name, barcode, soll, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return backTo({
        err: "Dieser Barcode ist für diese Rettungswache bereits vergeben.",
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