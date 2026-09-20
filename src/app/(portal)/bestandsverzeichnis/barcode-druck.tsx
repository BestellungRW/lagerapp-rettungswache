"use client";

import { useState } from "react";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import { toEan13, todayLabel } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Einheitliche Strichcode-Größe für den Ausdruck: 8 cm breit, 1 cm hoch. */
const BAR_WIDTH_MM = 80;
const BAR_HEIGHT_MM = 10;

function renderBarcode(value: string): { url: string; aspect: number } {
  const canvas = document.createElement("canvas");
  const ean = toEan13(value);
  if (ean === value) {
    // EAN-13: feste Länge / festes Erscheinungsbild
    const moduleWidth = 2;
    const moduleCount = 95;
    const height = (moduleCount * moduleWidth) / 5; // exakt 5:1
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
      height: 38,
      margin: 0,
      displayValue: false,
    });
  }
  const aspect = canvas.height > 0 ? canvas.width / canvas.height : 5;
  return { url: canvas.toDataURL("image/png"), aspect };
}

function buildPdf(products: Product[], stationName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const cols = 2;
  const x0 = 10;
  const y0 = 24;
  const gapX = 10;
  const rowH = 27;
  const labelPad = 13;

  doc.setFontSize(12);
  doc.text("Strichcodes – " + stationName + " – " + todayLabel(), 10, 11);
  doc.setFontSize(8);
  doc.text(
    "Barcode-Größe einheitlich: 8 cm x 1 cm – die Nummer darunter ist zum manuellen Eingeben gedacht",
    10,
    17
  );

  products.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + col * (BAR_WIDTH_MM + gapX);
    let y = y0 + row * rowH;
    if (y + rowH > 297 - 10) {
      doc.addPage();
      y = y0;
    }

    const { url, aspect } = renderBarcode(p.barcode);

    // Verzerrungsfrei in die 8x1-cm-Fläche einpassen
    let w = BAR_WIDTH_MM;
    let h = w / aspect;
    if (h > BAR_HEIGHT_MM) {
      h = BAR_HEIGHT_MM;
      w = h * aspect;
    }
    const dx = x + (BAR_WIDTH_MM - w) / 2;
    const dy = y + (BAR_HEIGHT_MM - h) / 2;

    doc.addImage(url, "PNG", dx, dy, w, h);

    // Barcode-Nummer groß und gut lesbar unter dem Strichcode
    const number = p.barcode;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    let numPad = 8;
    while (
      doc.getTextWidth(number) > BAR_WIDTH_MM - numPad &&
      numPad <= 80
    ) {
      doc.setFontSize(doc.getFontSize() - 1);
      numPad += 2;
    }
    doc.text(number, x + BAR_WIDTH_MM / 2, y + BAR_HEIGHT_MM + 6, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let name = p.name;
    if (name.length > 30) name = name.slice(0, 29) + "…";
    doc.text(name, x, y + BAR_HEIGHT_MM + 9.5);
    doc.text("Soll: " + p.soll, x, y + BAR_HEIGHT_MM + 12);
    doc.setDrawColor(200);
    doc.rect(x, y, BAR_WIDTH_MM, BAR_HEIGHT_MM + labelPad);
  });

  const file = "Strichcodes_" + stationName.toLowerCase().replace(/\W+/g, "-");
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
            werden soll. Der Barcode ist immer einheitlich 8 cm breit und 1 cm
            hoch; darunter steht die Barcode-Nummer groß und gut lesbar zum
            manuellen Eingeben sowie der Artikel mit der Soll-Menge.
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