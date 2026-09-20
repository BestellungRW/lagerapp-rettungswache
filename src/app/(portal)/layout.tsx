import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, TABS, canSeeTab, type Role } from "@/lib/roles";
import { getStationContext } from "@/lib/station-context";
import PortalNav from "@/components/portal-nav";
import LogoutButton from "@/components/logout-button";
import MedLogo from "@/components/med-logo";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, station_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as Role | undefined | null;

  if (!profile || !role) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <MedLogo className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-xl font-bold text-med-900">
            Konto noch nicht freigeschaltet
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            Ihrem Konto wurde noch keine Rolle und keine Rettungswache
            zugewiesen. Bitte wenden Sie sich an den Administrator.
          </p>
          <div className="mt-5">
            <LogoutButton label="Abmelden" />
          </div>
        </div>
      </div>
    );
  }

  const ctx = await getStationContext();
  const tabs = TABS.filter((t) => canSeeTab(role, t.key));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="relative">
        <div
          aria-hidden
          className="h-1.5 bg-linear-to-r from-med-700 via-med-400 to-accent-500"
        />
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <MedLogo className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight text-med-900 sm:text-xl">
                  LagerApp Rettungswache
                </p>
                {ctx.stationName && (
                  <p className="text-xs font-medium text-med-600">
                    {ctx.stationName}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <div className="flex items-center gap-2 rounded-full border border-med-200 bg-med-50 py-1 pl-1 pr-3">
                <span className="hidden max-w-44 truncate text-sm font-semibold text-med-900 sm:block">
                  {profile.email}
                </span>
                <span className="chip bg-accent-100 text-accent-700">
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <LogoutButton label="Abmelden" compact />
            </div>
          </div>
        </div>
        <PortalNav tabs={tabs} />
      </header>
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4">
        {children}
      </main>
      <footer className="relative mt-8 bg-med-900 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 text-center">
          <MedLogo className="h-8 w-8 opacity-80" />
          <p className="text-xs text-med-200">
            LagerApp Rettungswache · Bestandsaufnahme medizinisches
            Verbrauchsmaterial
          </p>
        </div>
      </footer>
    </div>
  );
}