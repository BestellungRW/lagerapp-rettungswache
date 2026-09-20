import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getStationContext } from "@/lib/station-context";
import PrintButton from "./qr-print-button";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const ctx = await getStationContext();
  if (!ctx.isAdmin) redirect("/");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

  let dataUrl: string | null = null;
  let error: string | null = null;
  try {
    dataUrl = await QRCode.toDataURL(appUrl, {
      width: 800,
      margin: 2,
      color: { dark: "#042f2e", light: "#ffffff" },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h-section">QR-Code für die Anmeldung</h1>
          <p className="mt-1 text-sm text-stone-600">
            Drucken Sie diesen QR-Code aus und bringen Sie ihn an der
            Rettungswache an. Benutzer gelangen per Smartphone direkt zur
            Anmeldung.
          </p>
        </div>
        <PrintButton label="Drucken" />
      </section>

      {error ? (
        <p className="notice-error">QR-Code konnte nicht erzeugt werden: {error}</p>
      ) : dataUrl ? (
        <section className="card mx-auto flex max-w-md flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={"QR-Code für " + appUrl}
            width={320}
            height={320}
            className="h-auto w-full rounded-lg border border-med-100"
          />
          <p className="mt-4 break-all text-sm font-medium text-med-900">
            {appUrl}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            LagerApp Rettungswache · Zugang zur Bestandsaufnahme
          </p>
        </section>
      ) : null}
    </div>
  );
}