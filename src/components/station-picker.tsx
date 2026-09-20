"use client";

import { useRouter } from "next/navigation";
import { setWorkingStation } from "@/actions/station";
import type { Station } from "@/lib/types";

export default function StationPicker({
  stations,
  currentStationId,
}: {
  stations: Station[];
  currentStationId: string | null;
}) {
  const router = useRouter();

  if (stations.length === 0) return null;

  return (
    <select
      className="input sm:w-auto"
      value={currentStationId ?? ""}
      onChange={async (e) => {
        const v = e.target.value;
        if (!v) return;
        await setWorkingStation(v);
        router.refresh();
      }}
    >
      {stations.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}