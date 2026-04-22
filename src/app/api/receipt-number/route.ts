import { NextResponse } from "next/server";
import { generateReceiptNumber } from "@/lib/receipt";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const receiptNumber = await generateReceiptNumber();
    return NextResponse.json({ receiptNumber });
  } catch {
    return NextResponse.json({ error: "Failed to generate receipt number" }, { status: 500 });
  }
}
