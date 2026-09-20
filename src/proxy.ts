import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login", "/auth/confirm"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const { user, response } = await updateSession(request);

  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)",
  ],
};