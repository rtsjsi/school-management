import { NextResponse } from "next/server";
import { generateReceiptNumber } from "@/lib/receipt";

export async function GET() {
  try {
    const receiptNumber = await generateReceiptNumber();
    return NextResponse.json({ receiptNumber });
  } catch {
    return NextResponse.json({ error: "Failed to generate receipt number" }, { status: 500 });
  }
}
