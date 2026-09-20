export type Role = "admin" | "mpg" | "benutzer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  mpg: "MPG",
  benutzer: "Benutzer",
};

export type Tab = "bestandsaufnahme" | "bestandsverzeichnis" | "benutzer" | "qr";

export const TABS: { key: Tab; label: string; roles: Role[] }[] = [
  {
    key: "bestandsaufnahme",
    label: "Bestandsaufnahme",
    roles: ["admin", "mpg", "benutzer"],
  },
  {
    key: "bestandsverzeichnis",
    label: "Bestandsverzeichnis",
    roles: ["mpg", "admin"],
  },
  {
    key: "benutzer",
    label: "Benutzerverwaltung",
    roles: ["admin"],
  },
  {
    key: "qr",
    label: "QR-Code",
    roles: ["admin"],
  },
];

export const TAB_ROUTES: Record<Tab, string> = {
  bestandsaufnahme: "/",
  bestandsverzeichnis: "/bestandsverzeichnis",
  benutzer: "/benutzerverwaltung",
  qr: "/qr",
};

export function canSeeTab(role: Role | null | undefined, tab: Tab): boolean {
  if (!role) return false;
  return TABS.some((t) => t.key === tab && t.roles.includes(role));
}