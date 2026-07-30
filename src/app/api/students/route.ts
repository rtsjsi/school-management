import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

const PAGE_SIZE = 1000;
const MAX_LIMIT = 5000;

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const requested = parseInt(searchParams.get("limit") ?? "1000", 10);
    const limit = Math.min(
      Number.isFinite(requested) && requested > 0 ? requested : 1000,
      MAX_LIMIT
    );
    const excludeRte =
      searchParams.get("exclude_rte") === "1" ||
      searchParams.get("excludeRte") === "true";
    const supabase = await createClient();

    const students: {
      id: string;
      full_name: string;
      standard: string | null;
      division: string | null;
      gr_number: string | null;
    }[] = [];

    let from = 0;
    while (students.length < limit) {
      const to = Math.min(from + PAGE_SIZE - 1, limit - 1);
      let query = supabase
        .from("students")
        .select("id, full_name, standard, division, gr_number")
        .order("full_name")
        .range(from, to);
      if (excludeRte) {
        query = query.or("is_rte_quota.eq.false,is_rte_quota.is.null");
      }
      const { data, error } = await query;
      if (error) throw error;
      const batch = data ?? [];
      students.push(...batch);
      if (batch.length < PAGE_SIZE || students.length >= limit) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ students });
  } catch {
    return NextResponse.json({ students: [] });
  }
}
