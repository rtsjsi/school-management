import { type NextRequest, NextResponse } from "next/server";
import { redirectWithSessionCookies, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, user } = await updateSession(request);

  // Logged in: skip marketing/auth entry — go straight to app (no login flash)
  if (user) {
    if (pathname === "/" || pathname === "/login") {
      return redirectWithSessionCookies(request, "/welcome", response);
    }
    return response;
  }

  // Not logged in: root goes to login (avoid double navigation)
  if (pathname === "/") {
    return redirectWithSessionCookies(request, "/login", response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on app HTML routes so the session is refreshed before RSC.
     * Excludes static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
