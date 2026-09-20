export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayLabel(): string {
  const d = new Date();
  return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
}

export interface ExpiryParts {
  mm: number;
  yyyy: number;
}

export type ExpiryInterpretation =
  | { ok: true; mm: number; yyyy: number }
  | { ok: false; hint: string };

function isValidYear(y: number): boolean {
  return y >= 1900 && y <= 2200;
}

function monthOf(n: number): boolean {
  return n >= 1 && n <= 12;
}

function dayOf(n: number): boolean {
  return n >= 1 && n <= 31;
}

function year2(y: number): number {
  return 2000 + y;
}

/**
 * Interpretiert ein Verfallsdatum in vielen Eingabevarianten.
 * Formate u. a.: 09/26, 09.26, 09/2026, 09.2026, 0926, 092026,
 * 01.09.2026, 01.09.26, 01/09/26, 01/09/2026, 01092026, 26.09 (Jahr fehlt).
 * Liefert ok:false mit Hinweis, wenn das Format mehrdeutig oder ungültig ist.
 */
export function interpretExpiry(input: string): ExpiryInterpretation {
  const s = input.trim();
  if (!s) return { ok: false, hint: "Bitte ein Verfallsdatum eingeben." };

  const parts = s.split(/[.\/,\-:\s]+/).filter((p) => p !== "");

  // Nur eine zusammenhängende Ziffernfolge (z. B. 0926, 092026, 01092026)
  if (parts.length === 1) {
    const d = parts[0];
    if (!/^\d{2,8}$/.test(d)) {
      return { ok: false, hint: "Bitte Datum im Format MM.JJJJ oder TT.MM.JJJJ angeben." };
    }

    if (d.length === 4) {
      // 0926 → MMYY
      const mm = Number(d.slice(0, 2));
      const yy = Number(d.slice(2, 4));
      if (monthOf(mm)) return { ok: true, mm, yyyy: year2(yy) };
      return { ok: false, hint: "Monat nicht gültig („" + d.slice(0, 2) + "“)." };
    }

    if (d.length === 6) {
      // 092026 → MMYYYY  oder  010926 → DDMMYY
      const mm = Number(d.slice(0, 2));
      const mmdd = Number(d.slice(2, 4));
      const yy = Number(d.slice(4, 6));
      const yyyy = Number(d.slice(2, 6));
      if (monthOf(mm) && isValidYear(yyyy)) {
        return { ok: true, mm, yyyy };
      }
      if (dayOf(mm) && monthOf(mmdd)) {
        return { ok: true, mm: mmdd, yyyy: year2(yy) };
      }
      return { ok: false, hint: "Datum nicht eindeutig – bitte Format MM.JJJJ oder TT.MM.JJJJ verwenden." };
    }

    if (d.length === 8) {
      // 01092026 → DDMMYYYY
      const dd = Number(d.slice(0, 2));
      const mm = Number(d.slice(2, 4));
      const yyyy = Number(d.slice(4, 8));
      if (dayOf(dd) && monthOf(mm) && isValidYear(yyyy)) {
        return { ok: true, mm, yyyy };
      }
      return { ok: false, hint: "Datum nicht gültig – bitte Format TT.MM.JJJJ verwenden." };
    }

    return { ok: false, hint: "Bitte Datum im Format MM.JJJJ oder TT.MM.JJJJ angeben." };
  }

  // Mehrere trenner-getrennte Teile
  if (parts.length === 2) {
    // 09/26, 09.2026, 2026.09
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    const aLen = parts[0].length;
    const bLen = parts[1].length;

    // 2026.09 → Jahr.Monat
    if (aLen === 4 && isValidYear(a) && monthOf(b)) {
      return { ok: true, mm: b, yyyy: a };
    }
    // 01.09, 09.10 → mehrdeutig (Monat.Jahr oder Tag.Monat)
    if (bLen <= 2 && monthOf(a) && monthOf(b)) {
      return { ok: false, hint: "Mehrdeutig – bitte Format MM.JJJJ oder TT.MM.JJJJ verwenden (z. B. 09.2026 oder 01.09.2026)." };
    }
    // 09.2026 → Monat.Jahr
    if (monthOf(a) && (bLen === 4 ? isValidYear(b) : bLen === 2)) {
      return { ok: true, mm: a, yyyy: bLen === 4 ? b : year2(b) };
    }
    // 26.09 → Tag.Monat (Jahr fehlt) → Hinweis
    if (bLen <= 2 && monthOf(b) && dayOf(a) && !monthOf(a)) {
      return { ok: false, hint: "Jahr fehlt – bitte Format MM.JJJJ oder TT.MM.JJJJ verwenden (z. B. 09.2026 oder 26.09.2026)." };
    }
    return { ok: false, hint: "Bitte Datum im Format MM.JJJJ oder TT.MM.JJJJ angeben." };
  }

  if (parts.length === 3) {
    // 01.09.2026, 01.09.26, 1.9.2026
    const dd = Number(parts[0]);
    const mm = Number(parts[1]);
    const last = parts[2];
    const lastN = Number(last);
    if (dayOf(dd) && monthOf(mm)) {
      if (last.length === 4 && isValidYear(lastN)) {
        return { ok: true, mm, yyyy: lastN };
      }
      if (last.length === 2) {
        return { ok: true, mm, yyyy: year2(lastN) };
      }
      return { ok: false, hint: "Jahr nicht gültig – bitte Format TT.MM.JJJJ (z. B. 01.09.2026)." };
    }
    return { ok: false, hint: "Tag/Monat nicht gültig – bitte Format TT.MM.JJJJ (z. B. 01.09.2026)." };
  }

  return { ok: false, hint: "Bitte Datum im Format MM.JJJJ oder TT.MM.JJJJ angeben." };
}

export function parseExpiry(input: string): ExpiryParts | null {
  const r = interpretExpiry(input);
  return r.ok ? { mm: r.mm, yyyy: r.yyyy } : null;
}

export function expiryToLabel(p: ExpiryParts): string {
  return pad(p.mm) + "/" + p.yyyy;
}

export function isExpired(p: ExpiryParts, now: Date = new Date()): boolean {
  const nowYm = now.getFullYear() * 12 + (now.getMonth() + 1);
  const expYm = p.yyyy * 12 + p.mm;
  return expYm <= nowYm;
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toNonNegativeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

/**
 * Prüft einen 12- oder 13-stelligen EAN-Code und liefert
 * die 13-stellige Normform (ergänzt ggf. die Prüfziffer).
 * Liefert null, wenn der Code nicht als EAN druckbar ist.
 */
export function toEan13(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) {
    return checkEan13(digits) ? digits : null;
  }
  if (digits.length === 12) {
    return digits + eanCheckDigit(digits);
  }
  return null;
}

function eanCheckDigit(s12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(s12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function checkEan13(s13: string): boolean {
  return eanCheckDigit(s13.slice(0, 12)) === Number(s13[12]);
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}