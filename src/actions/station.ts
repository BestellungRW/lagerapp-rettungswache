"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setWorkingStation(stationId: string) {
  const cookieStore = await cookies();
  cookieStore.set("rw_station", stationId, {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}