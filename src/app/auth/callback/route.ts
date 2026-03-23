import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { safeAuthNextPath } from "@/lib/site-url";

/**
 * Exchanges Supabase PKCE code from email links (signup, magic link, password recovery).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"), "/update-password");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent("Missing confirmation code")}`);
  }

  const { url, key } = getSupabaseEnv();
  const redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`
    );
  }

  return redirectResponse;
}
