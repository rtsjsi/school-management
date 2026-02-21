import { NextResponse } from "next/server";
import { getActiveAcademicYearName } from "@/lib/enrollment";

export async function GET() {
  try {
    const name = await getActiveAcademicYearName();
    return NextResponse.json({ name: name ?? "" });
  } catch {
    return NextResponse.json({ name: "" });
  }
}
