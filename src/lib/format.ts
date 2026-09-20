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

export function parseExpiry(input: string): ExpiryParts | null {
  const trimmed = input.trim();
  const m = trimmed.match(/^(\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const yyyy = Number(m[2]);
  if (mm < 1 || mm > 12 || yyyy < 2000 || yyyy > 2200) return null;
  return { mm, yyyy };
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