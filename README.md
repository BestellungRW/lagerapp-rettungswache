# LagerApp Rettungswache

Bestandsaufnahme und Bestelllisten für das medizinische Verbrauchsmaterial
auf Rettungswachen. Zugriff per QR-Code, Scan der Produkt-Barcodes mit der
Handy-/Tablet-Kamera, Erfassung der Ist-Mengen, optionale
Verfallsdatenkontrolle und Versand der Bestellliste als PDF per E-Mail.

## Technik

- Next.js (App Router + Server Actions)
- Supabase (Auth, PostgreSQL, Row Level Security)
- jsPDF (PDF-Erzeugung)
- Nodemailer (SMTP-Versand der Bestelllisten)
- html5-qrcode (Kamera-Barcode-Scan), qrcode (QR-Code-Druckseite)

## Einrichtung

Vollständige Schritt-für-Schritt-Anleitung: **[ANLEITUNG.md](ANLEITUNG.md)**

Kurzfassung:

1. Supabase-Projekt anlegen, Zugangsdaten in `.env.local` eintragen.
2. `supabase/schema.sql` im Supabase SQL Editor ausführen.
3. Ersten Admin-Account über Authentication → Add user anlegen und per SQL
   `role = 'admin'` setzen.
4. `npm install` und `npm run dev`, dann auf http://localhost:3000 anmelden.

## Rollen

| Rolle    | Rechte                                                         |
| -------- | --------------------------------------------------------------- |
| Benutzer | Bestandsaufnahme (scannen, Ist erfassen, E-Mail/PDF-Bestellliste) |
| MPG      | Zusätzlich Bestandsverzeichnis der eigenen Wache                 |
| Admin    | Zusätzlich Benutzerverwaltung aller Wachen                       |