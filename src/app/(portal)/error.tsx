"use client";

import { useEffect } from "react";
import MedLogo from "@/components/med-logo";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <MedLogo className="mx-auto h-14 w-14" />
        <h1 className="mt-3 text-xl font-bold text-med-900">
          Ein Fehler ist aufgetreten
        </h1>
        <p className="mt-2 text-sm text-stone-700">
          Die Seite konnte nicht geladen werden. Bitte versuchen Sie es
          erneut.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={() => retry()} className="btn">
            Erneut versuchen
          </button>
        </div>
      </div>
    </div>
  );
}