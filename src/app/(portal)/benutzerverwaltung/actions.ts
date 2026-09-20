"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStationContext } from "@/lib/station-context";
import { getServiceClient } from "@/lib/supabase/service";
import type { Role } from "@/lib/roles";

function backTo(opts: {
  ok?: string;
  err?: string;
  station?: string | null;
}): never {
  revalidatePath("/benutzerverwaltung");
  const params = new URLSearchParams();
  if (opts.ok) params.set("ok", opts.ok);
  if (opts.err) params.set("err", opts.err);
  if (opts.station) params.set("station", opts.station);
  return redirect(
    "/benutzerverwaltung" + (params.toString() ? "?" + params.toString() : "")
  );
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function isRole(value: string): value is Role {
  return value === "admin" || value === "mpg" || value === "benutzer";
}

async function requireAdmin() {
  const ctx = await getStationContext();
  if (!ctx.isAdmin) return backTo({ err: "Nur der Admin darf das." });
  return ctx;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createStation(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  if (!name) return backTo({ err: "Bitte einen Namen angeben." });

  const service = getServiceClient();
  const { error } = await service.from("stations").insert({ name } as never);
  if (error) return backTo({ err: "Anlegen fehlgeschlagen: " + error.message });
  return backTo({ ok: "Rettungswache »" + name + "« angelegt." });
}

export async function renameStation(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const station = text(formData, "station_id") || null;
  if (!id || !name) return backTo({ err: "Name fehlt.", station });

  const service = getServiceClient();
  const { error } = await service
    .from("stations")
    .update({ name } as never)
    .eq("id", id);
  if (error)
    return backTo({ err: "Umbenennen fehlgeschlagen: " + error.message, station });
  return backTo({ ok: "Rettungswache umbenannt.", station });
}

export async function deleteStation(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const station = text(formData, "station_id") || null;
  if (!id) return backTo({ err: "Keine Rettungswache angegeben.", station });

  const service = getServiceClient();
  const { error } = await service.from("stations").delete().eq("id", id);
  if (error)
    return backTo({ err: "Löschen fehlgeschlagen: " + error.message, station });
  return backTo({
    ok: "Rettungswache gelöscht (Artikel und Bestelllisten-Empfänger wurden mitgelöscht).",
    station,
  });
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const stationId = text(formData, "station_id");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const roleRaw = text(formData, "role");

  if (!validateEmail(email))
    return backTo({ err: "E-Mail-Adresse ungültig.", station: stationId });
  if (password.length < 6) {
    return backTo({
      err: "Passwort muss mindestens 6 Zeichen haben.",
      station: stationId,
    });
  }
  if (!isRole(roleRaw))
    return backTo({ err: "Rolle ungültig.", station: stationId });
  const role = roleRaw;

  const service = getServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (String(error.message).toLowerCase().includes("already registered")) {
      return backTo({
        err: "Diese E-Mail-Adresse ist bereits vergeben.",
        station: stationId,
      });
    }
    return backTo({
      err: "Konto anlegen fehlgeschlagen: " + error.message,
      station: stationId,
    });
  }

  const userId = data.user?.id;
  if (!userId)
    return backTo({ err: "Konto konnte nicht angelegt werden.", station: stationId });

  // Admin-Konten sind global (keine feste Rettungswache)
  const station = role === "admin" ? null : stationId || null;
  const { error: profileError } = await service
    .from("profiles")
    .update({ role, station_id: station } as never)
    .eq("id", userId);
  if (profileError) {
    return backTo({
      err: "Konto angelegt, aber Rolle konnte nicht gesetzt werden: " +
        profileError.message,
      station: stationId,
    });
  }
  return backTo({ ok: "Konto für " + email + " angelegt.", station: stationId });
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const userId = text(formData, "id");
  const stationId = text(formData, "station_id");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const roleRaw = text(formData, "role");

  if (!userId) return backTo({ err: "Konto nicht gefunden.", station: stationId });
  if (!isRole(roleRaw))
    return backTo({ err: "Rolle ungültig.", station: stationId });
  if (password && password.length < 6) {
    return backTo({
      err: "Passwort muss mindestens 6 Zeichen haben.",
      station: stationId,
    });
  }

  const service = getServiceClient();

  if (email || password) {
    const patch: { email?: string; password?: string; email_confirm?: boolean } =
      {};
    if (email && validateEmail(email)) {
      patch.email = email;
      patch.email_confirm = true;
    }
    if (password) patch.password = password;
    const { error } = await service.auth.admin.updateUserById(userId, patch);
    if (error) {
      return backTo({
        err: "Konto aktualisieren fehlgeschlagen: " + error.message,
        station: stationId,
      });
    }
  }

  const role = roleRaw;
  // Admin-Konten sind global (keine feste Rettungswache)
  const roleStation = role === "admin" ? null : stationId || null;
  const { error: profileError } = await service
    .from("profiles")
    .update({
      role,
      station_id: roleStation,
      email: email || undefined,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", userId);
  if (profileError) {
    return backTo({
      err: "Rolle speichern fehlgeschlagen: " + profileError.message,
      station: stationId,
    });
  }
  return backTo({ ok: "Konto aktualisiert.", station: stationId });
}

export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const userId = text(formData, "id");
  const station = text(formData, "station_id") || null;
  if (!userId) return backTo({ err: "Konto nicht gefunden.", station });

  const service = getServiceClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error)
    return backTo({ err: "Löschen fehlgeschlagen: " + error.message, station });
  return backTo({ ok: "Konto gelöscht.", station });
}

export async function addRecipient(formData: FormData) {
  await requireAdmin();
  const stationId = text(formData, "station_id");
  const email = text(formData, "email").toLowerCase();
  if (!stationId)
    return backTo({ err: "Keine Rettungswache angegeben.", station: stationId });
  if (!validateEmail(email))
    return backTo({ err: "E-Mail-Adresse ungültig.", station: stationId });

  const service = getServiceClient();
  const { error } = await service
    .from("order_email_recipients")
    .insert({ station_id: stationId, email } as never);
  if (error) {
    if (error.code === "23505") {
      return backTo({
        err: "Diese E-Mail-Adresse ist bereits hinterlegt.",
        station: stationId,
      });
    }
    return backTo({
      err: "Speichern fehlgeschlagen: " + error.message,
      station: stationId,
    });
  }
  return backTo({ ok: "Empfänger " + email + " hinterlegt.", station: stationId });
}

export async function removeRecipient(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const station = text(formData, "station_id") || null;
  if (!id) return backTo({ err: "Empfänger nicht gefunden.", station });

  const service = getServiceClient();
  const { error } = await service
    .from("order_email_recipients")
    .delete()
    .eq("id", id);
  if (error)
    return backTo({ err: "Löschen fehlgeschlagen: " + error.message, station });
  return backTo({ ok: "Empfänger entfernt.", station });
}