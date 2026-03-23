import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refreshes the Supabase session and returns the auth user + a `next()` response
 * with any updated cookies applied (required for SSR auth).
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}

/** Copy cookies from the session response onto a redirect (keeps refreshed tokens). */
export function redirectWithSessionCookies(
  request: NextRequest,
  pathname: string,
  source: NextResponse
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value);
  });
  return redirect;
}
