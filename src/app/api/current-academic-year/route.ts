import { NextResponse } from "next/server";
import { getActiveAcademicYearName } from "@/lib/enrollment";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const name = await getActiveAcademicYearName();
    return NextResponse.json({ name: name ?? "" });
  } catch {
    return NextResponse.json({ name: "" });
  }
}
