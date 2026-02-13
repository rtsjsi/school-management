import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const supabase = await createClient();
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, grade, section")
      .order("full_name")
      .limit(Math.min(limit, 500));
    return NextResponse.json({ students: students ?? [] });
  } catch {
    return NextResponse.json({ students: [] });
  }
}
