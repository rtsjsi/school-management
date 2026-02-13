import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Update Supabase session (refresh token, set cookies)
  // This runs only for protected routes (see matcher below)
  const response = await updateSession(request);
  return response;
}

export const config = {
  // Only run middleware for protected routes, skip auth pages and static assets
  matcher: [
    "/dashboard/:path*",
  ],
};
