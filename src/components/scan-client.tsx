"use client";

import { useCallback, useMemo, useState } from "react";
import BarcodeScanner from "@/components/barcode-scanner";
import StationPicker from "@/components/station-picker";
import {
  createOrderListPdf,
  fileNameFor,
  pdfDataUriBase64,
} from "@/lib/order-pdf";
import {
  expiryToLabel,
  interpretExpiry,
  isExpired,
  parseExpiry,
  todayLabel,
} from "@/lib/format";
import type {
  OrderRow,
  PackageRow,
  Product,
  ScanEntry,
  Station,
} from "@/lib/types";

interface Props {
  stationId: string | null;
  stationName: string;
  products: Product[];
  stations: Station[];
  isAdmin: boolean;
}

interface FormState {
  product: Product;
  ist: string;
  packages: { count: string; expiry: string }[];
  error: string | null;
}

/** Summe der Mengen aller als verfallen erkannten Packungen (übergebene Pakete haben count als Zahl). */
function expQty(packages: { count: number; expiry: string }[]): number {
  return packages.reduce((sum, p) => {
    const parsed = parseExpiry(p.expiry);
    return parsed && isExpired(parsed) ? sum + p.count : sum;
  }, 0);
}

export default function ScanClient({
  stationId,
  stationName,
  products,
  stations,
  isAdmin,
}: Props) {
  const [expiryMode, setExpiryMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [entries, setEntries] = useState<Record<string, ScanEntry>>({});
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const dateLabel = todayLabel();

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.barcode, p);
    return m;
  }, [products]);

  const entryList = useMemo(
    () =>
      Object.values(entries).sort((a, b) =>
        a.product.name.localeCompare(b.product.name, "de")
      ),
    [entries]
  );

  const totalOrder = useMemo(
    () =>
      entryList.reduce(
        (sum, e) => sum + Math.max(0, e.product.soll - e.ist + expQty(e.packages)),
        0
      ),
    [entryList]
  );

  function buildRows(): OrderRow[] {
    return entryList.map((e) => {
      const order = Math.max(
        0,
        e.product.soll - e.ist + expQty(e.packages)
      );
      return {
        name: e.product.name,
        barcode: e.product.barcode,
        soll: e.product.soll,
        ist: e.ist,
        order,
        packages: e.packages.map((p) => {
          const parsed = parseExpiry(p.expiry);
          return {
            count: p.count,
            expiry: p.expiry,
            expired: parsed ? isExpired(parsed) : false,
          };
        }),
      };
    });
  }

  const handleScan = useCallback(
    (raw: string) => {
      const barcode = raw.trim();
      if (!barcode) return;
      const product = productMap.get(barcode);
      if (!product) {
        setScanError(
          "Artikel mit dem Barcode »" + barcode + "« wurde nicht gefunden."
        );
        return;
      }
      setScanError(null);
      setForm({
        product,
        ist: "",
        packages: expiryMode ? [{ count: "", expiry: "" }] : [],
        error: null,
      });
    },
    [productMap, expiryMode]
  );

  function toggleExpiryMode() {
    setForm(null);
    setExpiryMode((v) => !v);
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    if (expiryMode) {
      const rows = form.packages.filter(
        (r) => r.count.trim() !== "" || r.expiry.trim() !== ""
      );
      // Vergriffen/leer = Menge 0 ist zulässig.
      const packages: PackageRow[] = [];
      for (const row of rows) {
        const raw = row.count.trim() === "" ? 0 : Math.floor(Number(row.count));
        if (row.count.trim() !== "" && !Number.isFinite(raw)) {
          setForm({
            ...form,
            error: "Mengen müssen als ganze Zahlen eingegeben werden.",
          });
          return;
        }
        const count = raw > 0 ? raw : 0;
        if (count === 0) continue; // Zeile ohne Menge = keine Packung
        const interp = interpretExpiry(row.expiry);
        if (!interp.ok) {
          setForm({ ...form, error: interp.hint });
          return;
        }
        packages.push({
          count,
          expiry: expiryToLabel({ mm: interp.mm, yyyy: interp.yyyy }),
        });
      }
      const ist = packages.reduce((sum, p) => sum + p.count, 0);
      const entry: ScanEntry = { product: form.product, ist, packages };
      setEntries((prev) => ({ ...prev, [form.product.id]: entry }));
      setForm(null);
      return;
    }

    const ist = Math.floor(Number(form.ist));
    if (!Number.isFinite(ist) || ist < 0) {
      setForm({
        ...form,
        error:
          "Bitte eine gültige Ist-Menge eintragen (0 ist erlaubt, z. B. wenn der Artikel vergriffen ist).",
      });
      return;
    }
    const entry: ScanEntry = { product: form.product, ist, packages: [] };
    setEntries((prev) => ({ ...prev, [form.product.id]: entry }));
    setForm(null);
  }

  function downloadPdf() {
    if (entryList.length === 0) return;
    const doc = createOrderListPdf({
      stationName,
      dateLabel,
      expiryMode,
      rows: buildRows(),
    });
    doc.save(fileNameFor(stationName, dateLabel));
  }

  async function sendEmail() {
    if (entryList.length === 0) return;
    setSending(true);
    setMessage(null);
    try {
      const rows = buildRows();
      const doc = createOrderListPdf({
        stationName,
        dateLabel,
        expiryMode,
        rows,
      });
      const res = await fetch("/api/send-order-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          stationName,
          dateLabel,
          expiryMode,
          rows,
          pdfBase64: pdfDataUriBase64(doc),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        recipients?: string[];
        error?: string;
      };
      if (data.ok && data.recipients) {
        setMessage({
          type: "ok",
          text: "Bestellliste erfolgreich gesendet an: " +
            data.recipients.join(", "),
        });
      } else {
        setMessage({
          type: "err",
          text: data.error || "Unbekannter Fehler beim E-Mail-Versand.",
        });
      }
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSending(false);
    }
  }

  function resetList() {
    if (entryList.length === 0) return;
    if (!window.confirm("Gescannte Artikel wirklich zurücksetzen?")) return;
    setEntries({});
    setMessage(null);
  }

  if (!stationId) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="h-section">Bestandsaufnahme</h1>
          <p className="mt-1 text-sm text-stone-600">
            Noch keine Rettungswache ausgewählt oder angelegt.
          </p>
        </section>
        {isAdmin ? (
          <p className="notice">
            Bitte legen Sie unter{" "}
            <a href="/benutzerverwaltung" className="font-semibold underline">
              Benutzerverwaltung
            </a>{" "}
            eine Rettungswache an und weisen Sie Ihr Konto einer Wache zu.
          </p>
        ) : (
          <p className="notice">
            Ihr Konto ist noch keiner Rettungswache zugeordnet. Bitte wenden
            Sie sich an den Administrator.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h-section">Bestandsaufnahme</h1>
          <p className="mt-1 text-sm text-stone-600">
            {products.length} Artikel hinterlegt · {stationName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <StationPicker stations={stations} currentStationId={stationId} />
          )}
          <button
            type="button"
            onClick={toggleExpiryMode}
            className={
              expiryMode ? "chip bg-accent-500 text-white" : "chip bg-med-100 text-med-800"
            }
            title="Verfallsdatenkontrolle ein-/ausschalten"
          >
            {expiryMode ? "✔ Verfallsdatenkontrolle AN" : "Verfallsdatenkontrolle"}
          </button>
        </div>
      </section>

      {expiryMode && (
        <p className="notice text-sm">
          <strong>Verfallsdatenkontrolle aktiv:</strong> Zusätzlich zur Menge
          wird pro Packung das Verfallsdatum abgefragt. Viele Formate werden
          erkannt (z. B. 09/26, 09.2026, 092026, 01.09.2026, 01/09/26,
          01092026) – bei Unklarheiten erhalten Sie einen Hinweis.
          Verfallene Packungen zählen nicht mehr als Bestand und erhöhen
          direkt die zu bestellende Menge (Ersatzbeschaffung). Menge 0 bedeutet
          „vergriffen“ und wird nachbestellt.
        </p>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-med-900">Artikel scannen</h2>
          <button
            type="button"
            onClick={() => setCameraActive((v) => !v)}
            className={cameraActive ? "btn btn-red btn-small" : "btn btn-small"}
          >
            {cameraActive ? "Kamera stoppen" : "Kamera starten"}
          </button>
        </div>
        <div className="mt-3">
          <BarcodeScanner
            active={cameraActive}
            paused={form !== null}
            onScan={handleScan}
          />
        </div>
        {scanError && (
          <p className="notice-error mt-3">{scanError}</p>
        )}
        {form && (
          <p className="mt-3 text-xs text-stone-500">
            Formular offen – die Kamera scannt pausiert. Nach dem Speichern
            können Sie direkt den nächsten Artikel scannen.
          </p>
        )}
      </section>

      {form && (
        <section className="card border-med-300 bg-med-50/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-med-900">
                {form.product.name}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Barcode: {form.product.barcode}
              </p>
              <p className="mt-1 text-sm text-med-800">
                Soll-Menge (Mindestbestand): <strong>{form.product.soll}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn btn-small btn-outline"
            >
              Abbrechen
            </button>
          </div>

          <form onSubmit={submitForm} className="mt-4 space-y-4">
            {!expiryMode && (
              <div>
                <label htmlFor="ist-count" className="label">
                  Derzeitige Ist-Menge
                </label>
                <input
                  id="ist-count"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input sm:max-w-52"
                  placeholder="z. B. 12, 0 = vergriffen"
                  value={form.ist}
                  onChange={(e) =>
                    setForm({ ...form, ist: e.target.value, error: null })
                  }
                  autoFocus
                />
                <p className="mt-1 text-xs text-stone-500">
                  0 eintragen, wenn der Artikel vergriffen ist – er wird dann
                  nachbestellt.
                </p>
              </div>
            )}

            {expiryMode && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-med-900">
                  Packungen (Menge + Verfallsdatum)
                </p>
                {form.packages.map((pkg, idx) => {
                  const parsed = parseExpiry(pkg.expiry);
                  const expired = parsed ? isExpired(parsed) : false;
                  const istSum = form.packages.reduce(
                    (s, p) => s + (Math.floor(Number(p.count)) || 0),
                    0
                  );
                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded-xl border border-med-200 bg-white p-3"
                    >
                      <div>
                        <label className="label">Menge</label>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className="input sm:w-28"
                          placeholder="z. B. 5"
                          value={pkg.count}
                          onChange={(e) => {
                            const next = [...form.packages];
                            next[idx] = { ...pkg, count: e.target.value };
                            setForm({ ...form, packages: next, error: null });
                          }}
                        />
                      </div>
                      <div className="min-w-40 flex-1">
                        <label className="label">
                          Verfallsdatum{" "}
                          <span className="font-normal text-stone-500">
                            (z. B. 09/2026 oder 01.09.2026)
                          </span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="z. B. 092026, 09/26, 01.09.2026"
                          className={
                            expired ? "input border-accent-400" : "input"
                          }
                          value={pkg.expiry}
                          onChange={(e) => {
                            const next = [...form.packages];
                            next[idx] = { ...pkg, expiry: e.target.value };
                            setForm({ ...form, packages: next, error: null });
                          }}
                        />
                        {pkg.expiry.trim() !== "" && !parsed && (
                          <p className="mt-1 text-xs font-semibold text-accent-700">
                            Verfallsdatum nicht erkannt – bitte Format prüfen
                            (z. B. 09/2026 oder 01.09.2026).
                          </p>
                        )}
                        {pkg.expiry.trim() !== "" && parsed && !expired && (
                          <p className="mt-1 text-xs text-stone-500">
                            Erkannt: {expiryToLabel(parsed)}
                          </p>
                        )}
                        {expired && pkg.expiry.trim() && (
                          <p className="mt-1 text-xs font-semibold text-accent-700">
                            Packung ist zum Erfassungszeitpunkt bereits
                            verfallen und wird nachbestellt.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <span className="text-xs text-stone-500">
                          Summe: {istSum}
                        </span>
                        {form.packages.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-small btn-red"
                            onClick={() =>
                              setForm({
                                ...form,
                                packages: form.packages.filter(
                                  (_, i) => i !== idx
                                ),
                              })
                            }
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={() =>
                    setForm({
                      ...form,
                      packages: [
                        ...form.packages,
                        { count: "", expiry: "" },
                      ],
                    })
                  }
                >
                  + Weitere Packung hinzufügen
                </button>
              </div>
            )}

            {form.error && (
              <p className="notice-error">{form.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn">
                Ist-Menge übernehmen
              </button>
              <span className="text-xs text-stone-500">
                Gesamt-Ist (inkl. Packungen):{" "}
                {expiryMode
                  ? form.packages.reduce(
                      (s, p) => s + (Math.floor(Number(p.count)) || 0),
                      0
                    )
                  : form.ist || "–"}
              </span>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-med-900">
            Gescannte Artikel ({entryList.length})
          </h2>
          {entryList.length === 0 ? (
            <p className="text-sm text-stone-500">
              Noch keine Artikel erfasst. Scannen Sie den ersten Artikel.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendEmail}
                disabled={sending}
                className="btn btn-small"
              >
                {sending ? "Wird gesendet …" : "Bestellliste per E-Mail senden"}
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="btn btn-outline btn-small"
              >
                PDF herunterladen
              </button>
              <button
                type="button"
                onClick={resetList}
                className="btn btn-red btn-small"
              >
                Zurücksetzen
              </button>
            </div>
          )}
        </div>

        {message && (
          <p
            className={
              message.type === "ok" ? "notice-success mt-3" : "notice-error mt-3"
            }
          >
            {message.text}
          </p>
        )}

        {entryList.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Soll</th>
                  <th>Ist</th>
                  {expiryMode && <th>Verfallsdaten</th>}
                  <th>Zu bestellen</th>
                </tr>
              </thead>
              <tbody>
                {entryList.map((e) => {
                  const order = Math.max(
                    0,
                    e.product.soll - e.ist + expQty(e.packages)
                  );
                  const hasExpired = e.packages.some((p) => {
                    const parsed = parseExpiry(p.expiry);
                    return parsed ? isExpired(parsed) : false;
                  });
                  return (
                    <tr key={e.product.id}>
                      <th>
                        <span className="font-semibold text-med-900">
                          {e.product.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-stone-500">
                          {e.product.barcode}
                        </span>
                      </th>
                      <td>{e.product.soll}</td>
                      <td>
                        {e.ist}{" "}
                        {hasExpired && (
                          <span className="chip bg-accent-100 text-accent-700">
                            Verfallen
                          </span>
                        )}
                      </td>
                      {expiryMode && (
                        <td>
                          {e.packages.length === 0 ? (
                            "–"
                          ) : (
                            <ul className="space-y-0.5">
                              {e.packages.map((p, i) => {
                                const parsed = parseExpiry(p.expiry);
                                const label = parsed
                                  ? expiryToLabel(parsed)
                                  : p.expiry;
                                const expired = parsed
                                  ? isExpired(parsed)
                                  : false;
                                return (
                                  <li
                                    key={i}
                                    className={
                                      expired
                                        ? "text-xs font-semibold text-accent-700"
                                        : "text-xs text-stone-600"
                                    }
                                  >
                                    {label} × {p.count}
                                    {expired ? " (verfallen)" : ""}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                      )}
                      <td>
                        <strong
                          className={
                            order > 0 ? "text-accent-700" : "text-med-700"
                          }
                        >
                          {order}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th>Gesamt</th>
                  <td>–</td>
                  <td>
                    {entryList.reduce((s, e) => s + e.ist, 0)}
                  </td>
                  {expiryMode && <td>–</td>}
                  <td>{totalOrder}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}