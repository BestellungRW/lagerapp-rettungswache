import { jsPDF } from "jspdf";
import { expiryToLabel, parseExpiry } from "@/lib/format";
import type { OrderRow } from "@/lib/types";

export interface OrderListPdfInput {
  stationName: string;
  dateLabel: string;
  expiryMode: boolean;
  rows: OrderRow[];
}

function wrap(doc: jsPDF, text: string, width: number): string | string[] {
  return doc.splitTextToSize(text || "–", width);
}

function linesOf(value: string | string[]): string[] {
  return typeof value === "string" ? [value] : value;
}

function drawTable(
  doc: jsPDF,
  y: number,
  widths: number[],
  headers: string[],
  rowData: string[][],
  { lineHeight = 4.6, startX = 12 }: { lineHeight?: number; startX?: number } = {}
): number {
  const rows = Array.isArray(rowData) ? rowData : [];
  const right = startX + widths.reduce((a, b) => a + b, 0) + widths.length;
  doc.setLineWidth(0.2);

  const drawRowCells = (cells: string[], bold: boolean, top: number, height: number) => {
    const cellList = Array.isArray(cells) ? cells : [];
    doc.setFont("helvetica", bold ? "bold" : "normal");
    let x = startX + 1;
    cellList.forEach((cell, i) => {
      if (i >= widths.length) return;
      const textLines = linesOf(wrap(doc, cell ?? "", widths[i] - 2));
      doc.text(textLines, x, top + 3.5);
      doc.setDrawColor(200, 200, 200);
      doc.rect(x - 1, top, widths[i] + 1, height);
      x += widths[i] + 1;
    });
    doc.setDrawColor(0, 0, 0);
    doc.line(startX, top + height, right, top + height);
  };

  let top = y;
  drawRowCells(headers, true, top, lineHeight + 3);
  top += lineHeight + 3;
  for (let i = 0; i < rows.length; i++) {
    const cells = Array.isArray(rows[i]) ? rows[i] : [];
    const cellLines = cells.map((c, j) =>
      linesOf(wrap(doc, c ?? "", widths[j] - 2))
    );
    const height = Math.max(2, ...cellLines.map((l) => l.length)) * lineHeight + 3;
    if (top + height > 282) {
      doc.addPage();
      top = 18;
      drawRowCells(headers, true, top, lineHeight + 3);
      top += lineHeight + 3;
    }
    drawRowCells(cells, false, top, height);
    top += height;
  }
  return top;
}

export function createOrderListPdf({
  stationName,
  dateLabel,
  expiryMode,
  rows,
}: OrderListPdfInput): jsPDF {
  const doc = new jsPDF();
  const list = Array.isArray(rows) ? rows : [];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Bestellliste – Verbrauchsmaterial", 12, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Rettungswache: " + stationName, 12, 25);
  doc.text("Datum: " + dateLabel, 12, 31);

  if (expiryMode) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("Modus: Verfallsdatenkontrolle (Verfallsdaten berücksichtigt)", 12, 37);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  const yStart = expiryMode ? 43 : 40;

  const headers = expiryMode
    ? ["Artikel", "Soll", "Ist", "Verfallsdaten", "Zu bestellen"]
    : ["Artikel", "Soll", "Ist", "Zu bestellen"];
  const widths = expiryMode
    ? [72, 18, 18, 66, 24]
    : [104, 26, 26, 26];

  const sorted = [...list].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "de")
  );

  let toOrder = 0;
  let expiredCount = 0;
  let expiredQty = 0;

  const rowData: string[][] = sorted.map((r) => {
    toOrder += Number(r.order) || 0;
    const order = Math.max(0, Number(r.order) || 0);
    if (expiryMode) {
      const packages = Array.isArray(r.packages) ? r.packages : [];
      const expiredHere = packages.filter((p) => p.expired);
      expiredCount += expiredHere.length;
      expiredQty += expiredHere.reduce((s, p) => s + (Number(p.count) || 0), 0);
      const expText = packages
        .map((p) => {
          const parts = parseExpiry(String(p.expiry));
          const label = parts ? expiryToLabel(parts) : String(p.expiry);
          return label + " x" + String(p.count) + (p.expired ? " (VERFALLEN)" : "");
        })
        .join("\n");
      return [String(r.name), String(r.soll), String(r.ist), expText, String(order)];
    }
    return [String(r.name), String(r.soll), String(r.ist), String(order)];
  });

  const endY = drawTable(
    doc,
    yStart,
    widths,
    headers,
    rowData,
    { lineHeight: expiryMode ? 4.4 : 5 }
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  let summaryY = Math.min(endY + 8, 288);
  doc.text("Gesamt zu bestellen: " + toOrder + " Artikel", 12, summaryY);
  summaryY += 6;
  if (expiryMode && expiredCount > 0) {
    doc.setTextColor(185, 28, 28);
    doc.text(
      "Hinweis: " +
        expiredCount +
        " Packung(en) (Menge " +
        expiredQty +
        ") als verfallen deklariert und in die Bestellmenge eingerechnet (Ersatzbeschaffung).",
      12,
      summaryY
    );
    doc.setTextColor(0, 0, 0);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Erstellt mit LagerApp Rettungswache",
    12,
    Math.min(summaryY + 10, 292)
  );

  return doc;
}

export function fileNameFor(
  stationName: string,
  dateLabel: string
): string {
  return (
    "Bestellliste_" +
    stationName.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-") +
    "_" +
    dateLabel.replace(/[^0-9]/g, "-") +
    ".pdf"
  );
}

export function pdfDataUriBase64(doc: jsPDF): string {
  const uri = doc.output("datauristring");
  const idx = uri.indexOf(",");
  return idx >= 0 ? uri.slice(idx + 1) : "";
}