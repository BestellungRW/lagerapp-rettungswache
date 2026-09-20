"use client";

import { useState } from "react";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import { toEan13 } from "@/lib/format";
import type { Product } from "@/lib/types";

/** HERMA-5051-Etikettenbogen: A4, 48,3 x 25,4 mm, 4 x 11 Etiketten. */
const LABEL_W = 48.26;
const LABEL_H = 25.4;
const COLS = 4;
const ROWS = 11;
const PAGE_LEFT = 8.48;
const PAGE_TOP = 8.8;

function renderBarcode(value: string): { url: string; aspect: number } {
  const canvas = document.createElement("canvas");
  const ean = toEan13(value);
  if (ean === value) {
    // EAN-13: feste Länge, höheres Erscheinungsbild für bessere Scanbarkeit
    const moduleWidth = 2;
    const moduleCount = 95;
    const height = (moduleCount * moduleWidth) / 2; // ~2:1, Balken länger
    JsBarcode(canvas, ean, {
      format: "EAN13",
      width: moduleWidth,
      height,
      margin: 0,
      displayValue: false,
    });
  } else {
    // Fallback für Codes, die keine EAN-13 sind
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 60,
      margin: 0,
      displayValue: false,
    });
  }
  const aspect = canvas.height > 0 ? canvas.width / canvas.height : 2;
  return { url: canvas.toDataURL("image/png"), aspect };
}

/** Barcode-Nummer auf eine Zeilenbreite umbrechen und Schriftgröße passend wählen. */
function numberLines(doc: jsPDF, text: string, maxWmm: number) {
  let size = 11;
  for (;;) {
    doc.setFontSize(size);
    const lines: string[] = [];
    let rest = text;
    while (rest) {
      let take = rest.length;
      while (take > 0 && doc.getTextWidth(rest.slice(0, take)) > maxWmm) take--;
      if (take <= 0) break;
      lines.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
    if (lines.length >= 1 && lines.length <= 2) return { lines, size };
    size -= 0.5;
    if (size < 6) return { lines: [text], size };
  }
}

function buildPdf(products: Product[], stationName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  products.forEach((p, i) => {
    const page = Math.floor(i / (COLS * ROWS));
    const onPage = i - page * COLS * ROWS;
    const col = onPage % COLS;
    const row = Math.floor(onPage / COLS);
    if (page > doc.getNumberOfPages() - 1) doc.addPage();

    const x = PAGE_LEFT + col * LABEL_W;
    const y = PAGE_TOP + row * LABEL_H;

    // Rechte Seite: Strichcode (max. bis auf linke Spalte)
    const zoneX = x + 17;
    const zoneW = x + LABEL_W - 1.5 - zoneX;
    const zoneH = LABEL_H - 8.5;

    const { url, aspect } = renderBarcode(p.barcode);
    const w = Math.min(zoneW, zoneH * aspect);
    const h = w / aspect;
    const dx = zoneX + (zoneW - w) / 2;
    const dy = y + 1.2 + (zoneH - h) / 2;
    doc.addImage(url, "PNG", dx, dy, w, h);

    // Linke Seite: Barcode-Nummer, gut sichtbar
    doc.setFont("helvetica", "bold");
    const { lines, size } = numberLines(doc, p.barcode, 15);
    const lh = size * 0.3528 * 1.25; // Zeilenhöhe in mm
    const top = y + 1.2 + (zoneH - lines.length * lh) / 2 + lh * 0.8;
    lines.forEach((line, li) => {
      doc.setFontSize(size);
      doc.text(line, x + 1.2, top + li * lh);
    });

    // Unten: Artikel mit Soll-Menge, gut lesbar
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let name = p.name;
    while (name && doc.getTextWidth(name) > LABEL_W - 2.4) {
      name = name.slice(0, -1);
    }
    if (name !== p.name) name = name.slice(0, -1) + "…";
    doc.text(name, x + 1.2, y + LABEL_H - 4.6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Soll: " + p.soll, x + 1.2, y + LABEL_H - 1.8);
  });

  const file =
    "Strichcodes_HERMA5051_" + stationName.toLowerCase().replace(/\W+/g, "-");
  doc.save(file + ".pdf");
}

export default function BarcodeDruck({
  products,
  stationName,
}: {
  products: Product[];
  stationName: string;
}) {
  const [sel, setSel] = useState<Record<string, boolean>>({});

  const selectedCount = products.filter((p) => sel[p.id]).length;

  function setAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const p of products) next[p.id] = value;
    setSel(next);
  }

  function toggle(id: string) {
    setSel((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function print() {
    const chosen = products.filter((p) => sel[p.id]);
    if (chosen.length === 0) return;
    if (!chosen.every((p) => toEan13(p.barcode) === p.barcode)) {
      const ok = window.confirm(
        "Achtung: Einige Barcodes sind keine gültige EAN-13 und werden als " +
          "CODE128 gedruckt. Weiter?"
      );
      if (!ok) return;
    }
    buildPdf(chosen, stationName);
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-med-900">
            Strichcodes drucken
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Wählen Sie die Artikel aus, deren Strichcode als PDF gedruckt
            werden soll. Das PDF ist für den Etikettenbogen HERMA 5051
            ausgelegt (A4, 48,3 x 25,4 mm, 44 Etiketten pro Bogen). Je
            Etikett steht links die Barcode-Nummer, rechts der Strichcode und
            unten gut lesbar der Artikel mit der Soll-Menge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setAll(true)}
          >
            Alle wählen
          </button>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setAll(false)}
          >
            Keine
          </button>
          <button
            type="button"
            className="btn btn-small"
            onClick={print}
            disabled={selectedCount === 0}
          >
            Ausgewählte ({selectedCount}) als PDF drucken
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="notice mt-3">
          Noch keine Artikel vorhanden – zuerst unter „Neuer Artikel“ anlegen.
        </p>
      ) : (
        <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-med-100">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-med-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Alle auswählen"
                    onChange={(e) => setAll(e.target.checked)}
                  />
                </th>
                <th className="px-2 py-2">Artikel</th>
                <th className="px-2 py-2">Barcode</th>
                <th className="px-3 py-2 text-right">Soll</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-med-100 odd:bg-white even:bg-med-50/40"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={p.name + " auswählen"}
                      checked={sel[p.id] ?? false}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td className="px-2 py-2 font-medium text-med-900">
                    {p.name}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-stone-600">
                    {toEan13(p.barcode) === p.barcode ? (
                      p.barcode
                    ) : (
                      <span>
                        {p.barcode}{" "}
                        <span className="text-stone-400">(CODE128)</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{p.soll}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}