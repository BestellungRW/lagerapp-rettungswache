import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { toNonNegativeInt } from "@/lib/format";
import type { OrderRow } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, station_id")
    .eq("id", user.id)
    .maybeSingle();

  const smtpPass = process.env.SMTP_PASS;
  if (!smtpPass || smtpPass.startsWith("hier-")) {
    return NextResponse.json(
      { ok: false, error: "E-Mail-Versand ist nicht eingerichtet: SMTP_PASS in .env.local eintragen." },
      { status: 500 }
    );
  }

  let body: {
    stationId?: unknown;
    stationName?: unknown;
    dateLabel?: unknown;
    expiryMode?: unknown;
    rows?: unknown;
    pdfBase64?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const stationId = typeof body.stationId === "string" ? body.stationId : "";
  const stationName = String(body.stationName ?? "");
  const dateLabel = String(body.dateLabel ?? "");
  const expiryMode = body.expiryMode === true;
  const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  const rawRows = Array.isArray(body.rows) ? body.rows : [];

  if (!stationId || !stationName || !pdfBase64) {
    return NextResponse.json({ ok: false, error: "Unvollständige Daten." }, { status: 400 });
  }

  // Berechtigung: eigene Wache oder Admin
  const isAdmin = profile?.role === "admin";
  const isOwnStation = profile?.station_id === stationId;
  if (!isAdmin && !isOwnStation) {
    return NextResponse.json(
      { ok: false, error: "Keine Berechtigung für diese Rettungswache." },
      { status: 403 }
    );
  }

  const rows: OrderRow[] = rawRows.map((r) => {
    const rec = (r ?? {}) as Record<string, unknown>;
    const packagesArr = Array.isArray(rec.packages) ? rec.packages : [];
    return {
      name: String(rec.name ?? ""),
      barcode: String(rec.barcode ?? ""),
      soll: toNonNegativeInt(rec.soll),
      ist: toNonNegativeInt(rec.ist),
      order: toNonNegativeInt(rec.order),
      packages: packagesArr.map((p) => {
        const pkg = (p ?? {}) as Record<string, unknown>;
        return {
          count: toNonNegativeInt(pkg.count),
          expiry: String(pkg.expiry ?? ""),
          expired: pkg.expired === true,
        };
      }),
    };
  });

  const service = getServiceClient();
  const { data: recipients, error: recipError } = await service
    .from("order_email_recipients")
    .select("email")
    .eq("station_id", stationId);

  if (recipError) {
    return NextResponse.json(
      { ok: false, error: "Empfänger konnten nicht geladen werden: " + recipError.message },
      { status: 500 }
    );
  }

  const emailList = ((recipients ?? []) as { email: string | null }[]).map(
    (r) => r.email
  );
  const emails = emailList.filter(
    (email): email is string =>
      Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  );

  if (emails.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Für diese Rettungswache sind keine Empfänger-E-Mail-Adressen hinterlegt." },
      { status: 400 }
    );
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: smtpPass,
    },
  });

  const subject =
    (expiryMode ? "Verfallsdatenkontrolle – " : "") +
    "Bestellliste " +
    stationName +
    " " +
    dateLabel;

  const rowsText = rows
    .filter((r) => r.order > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((r) => `– ${r.name}: bestellen ${r.order} (Soll ${r.soll}, Ist ${r.ist})`)
    .join("\n") || "–";

  const expiryNote = expiryMode
    ? "Verfallsdatenkontrolle aktiv – Details siehe PDF-Anhang.\n"
    : "";

  const filename =
    "Bestellliste_" +
    stationName.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-") +
    "_" +
    dateLabel.replace(/[^0-9]/g, "-") +
    ".pdf";

  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const email of emails) {
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM || "LagerApp Rettungswache <Bestellung.RW@gmail.com>",
        to: email,
        subject,
        text:
          "Guten Tag,\n\n" +
          "anbei die Bestellliste für die Rettungswache „" +
          stationName +
          "“ vom " +
          dateLabel +
          ".\n" +
          expiryNote +
          "\nZu bestellende Artikel:\n" +
          rowsText +
          "\n\nMit freundlichen Grüßen\nLagerApp Rettungswache",
        attachments: [
          {
            filename,
            content: Buffer.from(pdfBase64, "base64"),
            contentType: "application/pdf",
          },
        ],
      });
      results.push({ email, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ email, ok: false, error: message });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    return NextResponse.json({
      ok: false,
      sent,
      recipients: emails,
      failed: failed.map((f) => ({ email: f.email, error: f.error })),
      error:
        "E-Mail-Versand unvollständig: " +
        sent +
        " zugestellt, " +
        failed.length +
        " fehlgeschlagen.",
    });
  }

  return NextResponse.json({ ok: true, sent, recipients: emails });
}