"use client";

import { useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { Profile } from "@/lib/types";
import ConfirmSubmitButton from "@/components/confirm-button";
import {
  renameStation,
  deleteStation,
  createUser,
  updateUser,
  deleteUser,
  addRecipient,
  removeRecipient,
} from "./actions";

export interface StationWithData {
  id: string;
  name: string;
  users: Profile[];
  recipients: { id: string; email: string }[];
}

const STATION_ROLES: Role[] = ["benutzer", "mpg"];

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-med-900 text-white",
  mpg: "bg-med-700 text-white",
  benutzer: "bg-med-100 text-med-900",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={
        "h-4 w-4 shrink-0 text-med-700 transition-transform " +
        (open ? "rotate-90" : "")
      }
      fill="currentColor"
    >
      <path d="M6 3l5 5-5 5V3z" />
    </svg>
  );
}

function RoleBadge({ role }: { role: Role | null }) {
  const r = role && role in ROLE_BADGE ? role : "benutzer";
  return (
    <span
      className={
        "inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-xs font-bold " +
        ROLE_BADGE[r]
      }
    >
      {ROLE_LABELS[r]}
    </span>
  );
}

export default function BenutzerverwaltungClient({
  stations,
  admins,
  initialStationId,
}: {
  stations: StationWithData[];
  admins: Profile[];
  initialStationId: string | null;
}) {
  const [openStationId, setOpenStationId] = useState<string | null>(
    initialStationId
  );
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);
  const [openAdminId, setOpenAdminId] = useState<string | null>(null);
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  function toggleStation(id: string) {
    setOpenStationId((cur) => (cur === id ? null : id));
    setOpenUserId(null);
    setShowNewUser(false);
  }

  function toggleUser(id: string) {
    setOpenUserId((cur) => (cur === id ? null : id));
  }

  function toggleAdmin(id: string) {
    setOpenAdminId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Rettungswachen mit verschachtelter Benutzerverwaltung */}
      {stations.map((s) => {
        const stationOpen = openStationId === s.id;
        return (
          <article
            key={s.id}
            className="overflow-hidden rounded-xl border border-med-100 bg-white"
          >
            <button
              type="button"
              onClick={() => toggleStation(s.id)}
              aria-expanded={stationOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-med-50/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-med-900">
                  {s.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-stone-500">
                  {s.users.length} Benutzer/MPG · {s.recipients.length}{" "}
                  Bestelllisten-Empfänger
                </span>
              </span>
              <Chevron open={stationOpen} />
            </button>

            {stationOpen && (
              <div className="space-y-4 border-t border-med-100 p-4">
                {/* Neues Konto anlegen */}
                <div className="rounded-xl border border-med-100 bg-med-50/40 p-4">
                  <button
                    type="button"
                    onClick={() => setShowNewUser((v) => !v)}
                    aria-expanded={showNewUser}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="font-bold text-med-900">
                      {showNewUser
                        ? "Neues Konto ausblenden"
                        : "Neues Konto anlegen (Benutzer/MPG)"}
                    </span>
                    <Chevron open={showNewUser} />
                  </button>
                  {showNewUser && (
                    <form action={createUser} className="mt-4 space-y-3">
                      <input type="hidden" name="station_id" value={s.id} />
                      <div>
                        <label className="label">E-Mail (Benutzername)</label>
                        <input
                          name="email"
                          type="email"
                          required
                          autoComplete="off"
                          className="input"
                          placeholder="name@beispiel.de"
                        />
                      </div>
                      <div>
                        <label className="label">Passwort</label>
                        <input
                          name="password"
                          type="password"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Rolle</label>
                        <select
                          name="role"
                          className="input"
                          defaultValue="benutzer"
                        >
                          {STATION_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-stone-500">
                          Benutzer: nur Bestandsaufnahme · MPG: kann auch das
                          Bestandsverzeichnis dieser Wache pflegen.
                        </p>
                      </div>
                      <button type="submit" className="btn">
                        Konto anlegen
                      </button>
                    </form>
                  )}
                </div>

                {/* Benutzer & MPG der Wache */}
                <div>
                  <h3 className="font-bold text-med-900">
                    Benutzer & MPG ({s.users.length})
                  </h3>
                  {s.users.length === 0 ? (
                    <p className="notice mt-2">
                      Für diese Rettungswache sind noch keine Konten angelegt.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {s.users.map((u) => {
                        const userOpen = openUserId === u.id;
                        return (
                          <li
                            key={u.id}
                            className="overflow-hidden rounded-xl border border-med-100 bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => toggleUser(u.id)}
                              aria-expanded={userOpen}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-med-50/40"
                            >
                              <span className="min-w-0 truncate text-sm font-medium text-med-900">
                                {u.email}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <RoleBadge role={u.role} />
                                <Chevron open={userOpen} />
                              </span>
                            </button>

                            {userOpen && (
                              <form
                                action={updateUser}
                                className="space-y-3 border-t border-med-100 p-3"
                              >
                                <input type="hidden" name="id" value={u.id} />
                                <input
                                  type="hidden"
                                  name="station_id"
                                  value={s.id}
                                />
                                <div>
                                  <label className="label">E-Mail</label>
                                  <input
                                    name="email"
                                    type="email"
                                    defaultValue={u.email}
                                    className="input"
                                  />
                                </div>
                                <div>
                                  <label className="label">Neues Passwort</label>
                                  <input
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="leer lassen = unverändert"
                                    className="input"
                                  />
                                </div>
                                <div>
                                  <label className="label">Rolle</label>
                                  <select
                                    name="role"
                                    className="input"
                                    defaultValue={u.role ?? "benutzer"}
                                  >
                                    {STATION_ROLES.map((r) => (
                                      <option key={r} value={r}>
                                        {ROLE_LABELS[r]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    className="btn btn-small"
                                  >
                                    Speichern
                                  </button>
                                  <ConfirmSubmitButton
                                    formAction={deleteUser}
                                    className="btn btn-red btn-small"
                                    message={
                                      "Konto für " +
                                      u.email +
                                      " wirklich löschen?"
                                    }
                                  >
                                    Löschen
                                  </ConfirmSubmitButton>
                                </div>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Wache verwalten */}
                <div className="rounded-xl border border-med-100 p-4">
                  <h3 className="font-bold text-med-900">
                    Rettungswache verwalten
                  </h3>
                  <form
                    action={renameStation}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="station_id" value={s.id} />
                    <div className="min-w-52 flex-1">
                      <label className="label">Name</label>
                      <input
                        name="name"
                        defaultValue={s.name}
                        required
                        className="input"
                      />
                    </div>
                    <button type="submit" className="btn btn-small">
                      Umbenennen
                    </button>
                  </form>
                  <div className="mt-3">
                    <ConfirmSubmitButton
                      formAction={deleteStation}
                      className="btn btn-red btn-small"
                      message={
                        "Rettungswache »" +
                        s.name +
                        "« wirklich löschen? Alle Artikel, Bestelllisten-Empfänger und die Zuordnung der Benutzerkonten werden entfernt."
                      }
                    >
                      Wache löschen
                    </ConfirmSubmitButton>
                  </div>
                </div>

                {/* Bestelllisten-Empfänger */}
                <div className="rounded-xl border border-med-100 p-4">
                  <h3 className="font-bold text-med-900">
                    Bestelllisten-Empfänger
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">
                    An diese E-Mail-Adressen wird die Bestellliste dieser Wache
                    gesendet (mehrere möglich).
                  </p>
                  <form action={addRecipient} className="mt-3 flex gap-2">
                    <input type="hidden" name="station_id" value={s.id} />
                    <input
                      name="email"
                      type="email"
                      required
                      className="input flex-1"
                      placeholder="bestellung@beispiel.de"
                    />
                    <button type="submit" className="btn btn-small">
                      Hinzufügen
                    </button>
                  </form>
                  {s.recipients.length === 0 ? (
                    <p className="notice mt-3">
                      Noch keine Empfänger hinterlegt. Ohne Empfänger kann die
                      Bestellliste nicht per E-Mail versendet werden.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {s.recipients.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-med-50/60 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-med-900">
                            {r.email}
                          </span>
                          <form action={removeRecipient}>
                            <input type="hidden" name="id" value={r.id} />
                            <input
                              type="hidden"
                              name="station_id"
                              value={s.id}
                            />
                            <button
                              type="submit"
                              className="btn btn-red btn-small"
                            >
                              Entfernen
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}

      {/* Admin-Konten: global, ganz unten */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-med-900">
              Admin-Konten (global)
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Admin-Konten gelten für alle Rettungswachen und haben vollen
              Zugriff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewAdmin((v) => !v)}
            aria-expanded={showNewAdmin}
            className={"btn" + (showNewAdmin ? " btn-outline" : "")}
          >
            {showNewAdmin ? "Schließen" : "Neuen Admin anlegen"}
          </button>
        </div>

        {showNewAdmin && (
          <form
            action={createUser}
            className="mt-4 space-y-3 rounded-xl border border-med-100 bg-med-50/40 p-4"
          >
            <input type="hidden" name="station_id" value="" />
            <input type="hidden" name="role" value="admin" />
            <div>
              <label className="label">E-Mail</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="name@beispiel.de"
                className="input"
              />
            </div>
            <div>
              <label className="label">Passwort</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Passwort"
                className="input"
              />
            </div>
            <button type="submit" className="btn">
              Admin anlegen
            </button>
          </form>
        )}

        {admins.length === 0 ? (
          <p className="notice mt-3">
            Noch keine Admin-Konten angelegt. Legen Sie mindestens einen Admin
            an – er kann sich auf allen Rettungswachen anmelden.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {admins.map((a) => {
              const adminOpen = openAdminId === a.id;
              return (
                <li
                  key={a.id}
                  className="overflow-hidden rounded-xl border border-med-100 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleAdmin(a.id)}
                    aria-expanded={adminOpen}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-med-50/40"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-med-900">
                      {a.email}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <RoleBadge role="admin" />
                      <Chevron open={adminOpen} />
                    </span>
                  </button>

                  {adminOpen && (
                    <form
                      action={updateUser}
                      className="space-y-3 border-t border-med-100 p-3"
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="station_id" value="" />
                      <input type="hidden" name="role" value="admin" />
                      <div>
                        <label className="label">E-Mail</label>
                        <input
                          name="email"
                          type="email"
                          defaultValue={a.email}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Neues Passwort</label>
                        <input
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="leer = unverändert"
                          className="input"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="inline-flex items-center rounded-lg bg-med-900 px-2 py-1 text-xs font-bold text-white">
                          {ROLE_LABELS.admin}
                        </span>
                        <div className="flex flex-1 justify-end gap-2">
                          <button type="submit" className="btn btn-small">
                            Speichern
                          </button>
                          <ConfirmSubmitButton
                            formAction={deleteUser}
                            className="btn btn-red btn-small"
                            message={
                              "Admin-Konto für " + a.email + " wirklich löschen?"
                            }
                          >
                            Löschen
                          </ConfirmSubmitButton>
                        </div>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}