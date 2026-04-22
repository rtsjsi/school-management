import { NextResponse } from "next/server";
import { getSchoolSettingsWithUrls } from "@/lib/school-settings";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const settings = await getSchoolSettingsWithUrls();
    if (!settings) {
      return NextResponse.json(
        { name: "School", address: "", phone: "", email: "", logoUrl: null, principalSignatureUrl: null },
        { status: 200 }
      );
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { name: "School", address: "", phone: "", email: "", logoUrl: null, principalSignatureUrl: null },
      { status: 200 }
    );
  }
}
