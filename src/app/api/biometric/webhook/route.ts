import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Log the URL and headers to see what the machine is sending
    console.log("=== BIOMETRIC WEBHOOK POST RECEIVED ===");
    console.log("URL:", req.url);
    
    const headers = Object.fromEntries(req.headers.entries());
    console.log("Headers:", JSON.stringify(headers, null, 2));

    // 2. Try to read the raw body
    const rawBody = await req.text();
    console.log("Raw Body:", rawBody);
    console.log("=======================================");

    // 3. Acknowledge receipt to the machine
    // Some machines just need a 200 OK. Some ADMS protocols require a specific string like "OK"
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing biometric webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Some devices use GET requests for initial handshakes or specific data requests
    console.log("=== BIOMETRIC WEBHOOK GET RECEIVED ===");
    console.log("URL:", req.url);
    
    const headers = Object.fromEntries(req.headers.entries());
    console.log("Headers:", JSON.stringify(headers, null, 2));
    
    console.log("======================================");

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing biometric webhook GET:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
