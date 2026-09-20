# LagerApp Rettungswache – Einrichtungsanleitung

Die App verwaltet das medizinische Verbrauchsmaterial auf einer
Rettungswache: Barcodescannen per Smartphone/Tablet, Ist-Mengen erfassen,
Verfallsdatenkontrolle, Bestellliste als PDF per E-Mail – komplett mit
Rollen **Benutzer / MPG / Admin** und mehreren Rettungswachen.

Technik: **Next.js (App Router)** · **Supabase** (Auth + PostgreSQL + RLS) ·
**jsPDF** · **Nodemailer (SMTP)** · Kamera-Barcodescanner im Browser.

---

## 1. Voraussetzungen

- Node.js 18.18 oder neuer (empfohlen: 20+)
- Ein Gmail-Konto für den E-Mail-Versand (bereits hinterlegt:
  `Bestellung.RW@gmail.com`)
- Ein Supabase-Projekt (kostenlos, siehe Schritt 2)

---

## 2. Supabase-Projekt anlegen

1. Öffne https://supabase.com/dashboard und melde dich an (z. B. mit deinem
   GitHub- oder Google-Konto).
2. Klicke auf **New project**.
3. Gib einen Namen ein (z. B. `lagerapp-rettungswache`), wähle ein Passwort
   für die Datenbank und ein Rechenzentrum (z. B. `Frankfurt (eu-central-1)`).
4. Warte, bis das Projekt erstellt ist (ca. 1–2 Minuten).

### Zugangsdaten kopieren

5. Öffne im Projekt **Project Settings → API**.
6. Kopiere:
   - **Project URL**  → in `.env.local` unter `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**  → in `.env.local` unter `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → in `.env.local` unter `SUPABASE_SERVICE_ROLE_KEY`
     (unbedingt geheim halten – nur für den Server!)

### Datenbank-Schema ausführen

7. Öffne im Dashboard den **SQL Editor**.
8. Kopiere den kompletten Inhalt von `supabase/schema.sql` hinein und klicke
   auf **Run**.

### Ersten Admin-Account anlegen

9. Öffne **Authentication → Users** und klicke auf **Add user**.
10. Gib die E-Mail-Adresse und ein Passwort für den ersten Admin ein
    (Häkchen „Auto Confirm User“ ist aktiv).
11. Öffne danach wieder den **SQL Editor** und führe aus (E-Mail-Adresse
    anpassen):

```sql
update public.profiles set role = 'admin' where email = 'deine-admin-email@beispiel.de';
```

Der Admin kann danach über die **Benutzerverwaltung** weitere Rettungswachen,
Konten und Rollen anlegen.

---

## 3. E-Mail-Versand (Gmail)

In `.env.local` ist bereits alles vorbereitet:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=Bestellung.RW@gmail.com
SMTP_PASS=<App-Passwort>
MAIL_FROM=LagerApp Rettungswache <Bestellung.RW@gmail.com>
```

Damit Gmail das App-Passwort akzeptiert:

1. Google-Konto öffnen → **Sicherheit**.
2. **2-Faktor-Authentifizierung** aktivieren (Pflicht für App-Passwörter).
3. Dort → **App-Passwörter** erzeugen (auf „E-Mail“ beschränkt).
4. Das 16‑stellige Passwort (Format `xxxx xxxx xxxx xxxx`) in
   `.env.local` unter `SMTP_PASS` eintragen.

---

## 4. Lokal starten

```bash
npm install
npm run dev
```

Öffne http://localhost:3000 und melde dich mit dem Admin-Konto an.

---

## 5. Erste Schritte als Admin

1. **Benutzerverwaltung → Rettungswachen → Anlegen**: z. B. „RW Stadtmitte“.
2. Unter der Wache **Benutzer & Bestelllisten**:
   - **Konto anlegen**: E-Mail + Passwort + Rolle (Benutzer/MPG/Admin).
   - **Bestelllisten-Empfänger**: E-Mail-Adressen hinterlegen, die die
     Bestellliste erhalten (mehrere möglich).
3. Als **MPG** anmelden → **Bestandsverzeichnis**: Artikel anlegen
   (Bezeichnung + Barcode + Soll-Menge), Soll-Mengen anpassen, Artikel
   löschen.

> Der Barcode ist der EAN/Artikel-Barcode, der an den Produkten haftet.
> Er muss genau dem entsprechen, was der Barcodescanner auf dem Handy
> ausliest.

---

## 6. Bestandsaufnahme (Arbeitsablauf)

1. Startseite → **Kamera starten** (auf dem Smartphone/Tablet).
2. Barcode vor die Kamera halten → Formular öffnet sich.
3. **Ist-Menge** eintragen → **Ist-Menge übernehmen**.
4. Nächsten Artikel scannen – die Liste füllt sich alphabetisch mit
   Soll/Ist/„Zu bestellen“.
5. Zum Abschluss **Bestellliste per E-Mail senden** (geht an alle
   Empfänger der Wache) oder **PDF herunterladen**.

### Verfallsdatenkontrolle

Der Button **„Verfallsdatenkontrolle“** oben aktiviert den Modus. Dann wird
beim Scannen zusätzlich pro Packung das **Verfallsdatum (MM.JJJJ)** abgefragt
(mehrere Packungen pro Artikel möglich). Packungen, deren Verfallsmonat im
aktuellen Monat liegt, gelten als verfallen und werden rot markiert – auch in
der Liste und in der PDF. Die Kontrolle findet normalerweise am letzten Tag
des Monats statt; Artikel, die im Folgemonat verfallen, werden so bereits
jetzt als verfallen geführt.

---

## 7. QR-Code

Der Admin sieht den Reiter **QR-Code**. Dort wird der QR-Code zur
App-URL angezeigt (Drucken-Button). Den Ausdruck an der Wache anbringen –
Benutzer gelangen per Handy-Kamera direkt zur Anmeldung.

---

## 8. Auf Netlify veröffentlichen

1. Lade das Projekt in ein Git-Repo hoch (z. B. GitHub).
2. https://app.netlify.com → **Add new site → Import an existing project**.
3. Build-Befehl: `npm run build`, Publish-Verzeichnis: `next` ist nicht
   nötig (Netlify erkennt Next.js automatisch).
4. Unter **Environment variables** alle Werte aus `.env.local` eintragen
   (**nicht** comitten! `.env.local` ist per `.gitignore` ausgeschlossen).
5. Nach dem Deploy die Netlify-Adresse (z. B.
   `https://deine-app.netlify.app`) unter `NEXT_PUBLIC_APP_URL` eintragen –
   wichtig für den QR-Code.
6. Die hinterlegten Rettungswachen-Empfänger können danach sofort die
   Bestelllisten per E-Mail erhalten.

> **Hinweis Handling:** Die Barcode-Kamera benötigt HTTPS. Netlify liefert
> das automatisch aus.

---

## 9. Rollen

| Rolle    | Rechte                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Benutzer | Bestandsaufnahme: scannen, Ist erfassen, Verfallsdatenkontrolle, Bestellliste per E-Mail/PDF |
| MPG      | Wie Benutzer, plus **Bestandsverzeichnis** der eigenen Wache (Artikel anlegen/bearbeiten/löschen, Soll-Mengen) |
| Admin    | Alles, plus **Benutzerverwaltung**: Rettungswachen, Konten, Rollen, Bestelllisten-Empfänger |

Benutzer und MPG sind immer nur an die **ihnen zugeteilte Rettungswache**
gebunden. Der Admin verwaltet alle Rettungswachen.