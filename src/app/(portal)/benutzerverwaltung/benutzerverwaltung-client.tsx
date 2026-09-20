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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={
        "h-4 w-4 text-med-700 transition-transform " +
        (open ? "rotate-90" : "")
      }
      fill="currentColor"
    >
      <path d="M6 3l5 5-5 5V3z" />
    </svg>
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
  const [openId, setOpenId] = useState<string | null>(initialStationId);

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Admin-Konten: global, für alle Rettungswachen gleich */}
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
          <form action={createUser} className="flex flex-wrap gap-2">
            <input type="hidden" name="station_id" value="" />
            <input type="hidden" name="role" value="admin" />
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@beispiel.de"
              className="input min-w-52"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Passwort"
              className="input min-w-40"
            />
            <button type="submit" className="btn">
              Admin anlegen
            </button>
          </form>
        </div>

        {admins.length === 0 ? (
          <p className="notice mt-3">
            Noch keine Admin-Konten angelegt. Legen Sie mindestens einen Admin
            an – er kann sich auf allen Rettungswachen anmelden.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {admins.map((a) => (
              <form
                key={a.id}
                action={updateUser}
                className="flex flex-wrap items-end gap-2 rounded-xl border border-med-100 bg-med-50/40 p-3"
              >
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="station_id" value="" />
                <input type="hidden" name="role" value="admin" />
                <div className="min-w-52 flex-1">
                  <label className="label">E-Mail</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={a.email}
                    className="input"
                  />
                </div>
                <div className="min-w-40 flex-1">
                  <label className="label">Neues Passwort</label>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="leer = unverändert"
                    className="input"
                  />
                </div>
                <span className="inline-flex items-center rounded-lg bg-med-700 px-2 py-1 text-xs font-bold text-white">
                  {ROLE_LABELS.admin}
                </span>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-small">
                    Speichern
                  </button>
                  <ConfirmSubmitButton
                    formAction={deleteUser}
                    className="btn btn-red btn-small"
                    message={"Admin-Konto für " + a.email + " wirklich löschen?"}
                  >
                    Löschen
                  </ConfirmSubmitButton>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      {/* Rettungswachen mit aufklappbarer Benutzer-/Empfänger-Verwaltung */}
      {stations.map((s) => {
        const open = openId === s.id;
        return (
          <section key={s.id} className="card overflow-hidden p-0">
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-med-50/60"
              aria-expanded={open}
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
              <Chevron open={open} />
            </button>

            {open && (
              <div className="border-t border-med-100 p-4">
                {/* Wache umbenennen / löschen */}
                <form
                  action={renameStation}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="station_id" value={s.id} />
                  <div className="min-w-52 flex-1">
                    <label className="label">Wache umbenennen</label>
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
                </form>

                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  {/* Benutzer & MPG */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-med-100 bg-white p-4">
                      <h3 className="font-bold text-med-900">
                        Neues Konto (Benutzer / MPG)
                      </h3>
                      <form action={createUser} className="mt-3 space-y-3">
                        <input
                          type="hidden"
                          name="station_id"
                          value={s.id}
                        />
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
                          <select name="role" className="input" defaultValue="benutzer">
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
                    </div>

                    <div>
                      <h3 className="font-bold text-med-900">
                        Konten der Wache ({s.users.length})
                      </h3>
                      {s.users.length === 0 ? (
                        <p className="notice mt-2">
                          Für diese Rettungswache sind noch keine Konten
                          angelegt.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {s.users.map((u) => (
                            <form
                              key={u.id}
                              action={updateUser}
                              className="space-y-2 rounded-xl border border-med-100 bg-white p-3"
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
                                <button type="submit" className="btn btn-small">
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
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bestelllisten-Empfänger */}
                  <div className="rounded-xl border border-med-100 bg-white p-4">
                    <h3 className="font-bold text-med-900">
                      Bestelllisten-Empfänger
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">
                      An diese E-Mail-Adressen wird die Bestellliste dieser
                      Wache gesendet (mehrere möglich).
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
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}