"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface Props {
  /** Kamera-Scanner ein-/ausschalten */
  active: boolean;
  /** Kamera pausieren (z. B. während des Ist-Formulars) */
  paused: boolean;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ active, paused, onScan }: Props) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);

  function stopScanner() {
    const inst = scannerRef.current;
    if (!inst) return;
    scannerRef.current = null;
    inst.stop().catch(() => {});
    inst.clear();
    setRunning(false);
  }

  useEffect(() => {
    return () => {
      const inst = scannerRef.current;
      if (inst) {
        inst.stop().catch(() => {});
        inst.clear();
      }
      scannerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!active || paused) {
      stopScanner();
      return;
    }

    void (async () => {
      setStarting(true);
      setError(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const el = document.getElementById("qr-reader");
        if (!el) return;
        const instance = new Html5Qrcode("qr-reader");
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decoded) => {
            const now = Date.now();
            if (now - lastScanRef.current < 1500) return;
            lastScanRef.current = now;
            onScan(decoded);
          },
          () => {}
        );
        if (cancelled) {
          await instance.stop().catch(() => {});
          scannerRef.current = null;
          return;
        }
        setRunning(true);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(
          "Kamera konnte nicht gestartet werden. Braucht die Seite eine HTTPS-Verbindung? " +
            message
        );
        scannerRef.current = null;
      } finally {
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, paused, onScan]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const v = manual.trim();
    if (!v) return;
    setManual("");
    onScan(v);
  }

  return (
    <div className="space-y-3">
      {active && !error && (
        <div className="overflow-hidden rounded-xl bg-black">
          <div id="qr-reader" className="w-full [&_video]:block" />
          {starting && (
            <p className="px-4 py-2 text-center text-xs text-med-200">
              Kamera wird gestartet …
            </p>
          )}
          {running && (
            <p className="px-4 py-2 text-center text-xs text-med-200">
              Barcode vor die Kamera halten – er wird automatisch erkannt.
            </p>
          )}
        </div>
      )}

      {error && <p className="notice-error">{error}</p>}

      <div className="flex items-center gap-2">
        <form onSubmit={submitManual} className="flex w-full gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Barcode manuell eingeben oder einscannen …"
            className="input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button type="submit" className="btn btn-small shrink-0">
            Übernehmen
          </button>
        </form>
      </div>
    </div>
  );
}