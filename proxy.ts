import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/home-i18n";

const canonical = new URL(siteUrl());

export async function proxy(request: NextRequest) {
  // Production is also reachable on other *.vercel.app aliases (e.g. dukaan-online-<team>.vercel.app).
  // Send crawlers and visitors to the one canonical domain so Google sees a single copy of each page.
  const host = request.headers.get("host") ?? "";
  if (
    process.env.VERCEL_ENV === "production" &&
    (request.method === "GET" || request.method === "HEAD") &&
    host.endsWith(".vercel.app") &&
    host !== canonical.host
  ) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
