import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight DB touch for external schedulers (e.g. cron-job.org) so a free-tier
 * Supabase project keeps seeing activity. Must perform a real query — a bare HTTP
 * ping to Supabase REST without querying tables does not count.
 *
 * Set CRON_KEEPALIVE_SECRET in production and pass the same value as ?token=...
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_KEEPALIVE_SECRET;
  const url = new URL(request.url);
  if (secret) {
    const token = url.searchParams.get("token");
    if (token !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY on server" },
      { status: 500 }
    );
  }

  const { error } = await admin.from("academic_years").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
