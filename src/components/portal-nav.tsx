"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_ROUTES, type Tab } from "@/lib/roles";

export default function PortalNav({
  tabs,
}: {
  tabs: { key: Tab; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-t border-med-100 bg-white/90 shadow-[0_1px_0_#e3f1ee] backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-4">
        <ul className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const route = TAB_ROUTES[tab.key];
            const active =
              pathname === route || pathname.startsWith(route + "/");
            return (
              <li key={tab.key} className="shrink-0">
                <Link
                  href={route}
                  className={`block whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                    active
                      ? "bg-linear-to-r from-med-700 to-med-800 text-white shadow-[var(--shadow-btn)]"
                      : "text-med-800 hover:bg-med-100 hover:text-med-900"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}