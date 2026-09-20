import MedLogo from "@/components/med-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-linear-to-br from-[#f7fbfa] via-[#e9f6f3] to-[#d8eee9] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-med-300/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-accent-300/40 blur-3xl"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-3xl bg-white/85 p-2 shadow-[var(--shadow-pop)] ring-1 ring-med-500/10">
            <MedLogo className="h-20 w-20" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-med-900">
            LagerApp Rettungswache
          </h1>
          <p className="mt-1 text-center text-sm font-medium text-med-700">
            Bestandsaufnahme · Verbrauchsmaterial · Bestelllisten
          </p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-stone-400">
          Internes Portal für Rettungswachen · LagerApp Rettungswache
        </p>
      </div>
    </div>
  );
}