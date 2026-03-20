import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const excludeRte =
      searchParams.get("exclude_rte") === "1" ||
      searchParams.get("excludeRte") === "true";
    const supabase = await createClient();
    let query = supabase
      .from("students")
      .select("id, full_name, standard, division")
      .order("full_name")
      .limit(Math.min(limit, 500));
    if (excludeRte) {
      query = query.or("is_rte_quota.eq.false,is_rte_quota.is.null");
    }
    const { data: students } = await query;
    return NextResponse.json({ students: students ?? [] });
  } catch {
    return NextResponse.json({ students: [] });
  }
}
