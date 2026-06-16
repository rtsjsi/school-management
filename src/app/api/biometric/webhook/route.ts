import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    console.log("=== BIOMETRIC WEBHOOK POST RECEIVED ===");
    console.log("URL:", req.url);
    
    const headers = Object.fromEntries(req.headers.entries());
    const rawBody = await req.text();
    
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Raw Body:", rawBody);
    console.log("=======================================");

    if (supabase) {
      await supabase.from("biometric_raw_logs").insert({
        method: "POST",
        url: req.url,
        headers: headers,
        body: rawBody
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing biometric webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    console.log("=== BIOMETRIC WEBHOOK GET RECEIVED ===");
    console.log("URL:", req.url);
    
    const headers = Object.fromEntries(req.headers.entries());
    
    if (supabase) {
      await supabase.from("biometric_raw_logs").insert({
        method: "GET",
        url: req.url,
        headers: headers,
        body: null
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing biometric webhook GET:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
