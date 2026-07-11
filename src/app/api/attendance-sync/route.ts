import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { randomUUID, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const MAX_BATCH = 2000;

type IncomingPunch = {
  enrollNo?: unknown;
  punchedAt?: unknown;
  direction?: unknown;
  verifyMethod?: unknown;
  rawVerifyMode?: unknown;
  photoIndex?: unknown;
  machineNo?: unknown;
};

type Body = {
  machineNo?: unknown;
  punches?: IncomingPunch[];
};

function authorize(request: NextRequest): boolean {
  const expected = process.env.ATTENDANCE_SYNC_API_KEY;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;

  const provided = match[1].trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function asInt(value: unknown, fallback: number | null = null): number | null {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Device wall clock "YYYY-MM-DD HH:mm:ss" → timestamptz ISO with IST offset. */
function punchedAtToIso(value: unknown): string | null {
  const raw = asText(value);
  if (!raw) return null;
  // Already ISO with offset/Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(raw);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}+05:30`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : iso;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ATTENDANCE_SYNC_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured (missing ATTENDANCE_SYNC_API_KEY)." },
        { status: 500 }
      );
    }

    if (!authorize(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfigured (missing service role key)." },
        { status: 500 }
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const defaultMachineNo = asInt(body.machineNo, null);
    const punches = Array.isArray(body.punches) ? body.punches : null;
    if (!punches) {
      return NextResponse.json({ error: "punches array is required." }, { status: 400 });
    }
    if (punches.length === 0) {
      return NextResponse.json({ received: 0, inserted: 0, duplicatesSkipped: 0 });
    }
    if (punches.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Batch too large. Maximum ${MAX_BATCH} punches per request.` },
        { status: 400 }
      );
    }

    const syncBatchId = randomUUID();
    const rows: {
      enroll_no: string;
      punched_at: string;
      direction: string;
      verify_method: string | null;
      machine_no: number;
      raw_verify_mode: number;
      photo_index: number | null;
      sync_batch_id: string;
    }[] = [];

    const errors: string[] = [];
    for (let i = 0; i < punches.length; i++) {
      const p = punches[i];
      const enrollNo = asText(p.enrollNo);
      const punchedAt = punchedAtToIso(p.punchedAt);
      const direction = asText(p.direction);
      const machineNo = asInt(p.machineNo, defaultMachineNo);
      const rawVerifyMode = asInt(p.rawVerifyMode, 0) ?? 0;
      const photoIndex = asInt(p.photoIndex, null);
      const verifyMethod = asText(p.verifyMethod);

      if (!enrollNo || !punchedAt || !direction || machineNo == null) {
        errors.push(`punches[${i}]: enrollNo, punchedAt, direction, and machineNo are required`);
        continue;
      }

      rows.push({
        enroll_no: enrollNo,
        punched_at: punchedAt,
        direction,
        verify_method: verifyMethod,
        machine_no: machineNo,
        raw_verify_mode: rawVerifyMode,
        photo_index: photoIndex,
        sync_batch_id: syncBatchId,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid punches in batch.", details: errors.slice(0, 10) },
        { status: 400 }
      );
    }

    let inserted = 0;
    for (const part of chunk(rows, 500)) {
      const { data, error } = await admin
        .from("biometric_attendance_raw")
        .upsert(part, {
          onConflict: "machine_no,enroll_no,punched_at,direction,raw_verify_mode",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) {
        console.error("attendance-sync insert error", error);
        return NextResponse.json(
          { error: `Failed to save raw punches: ${error.message}` },
          { status: 500 }
        );
      }
      inserted += data?.length ?? 0;
    }

    const received = rows.length;
    return NextResponse.json({
      received,
      inserted,
      duplicatesSkipped: received - inserted,
      syncBatchId,
      invalidSkipped: errors.length,
      ...(errors.length ? { invalidDetails: errors.slice(0, 10) } : {}),
    });
  } catch (e) {
    console.error("attendance-sync error", e);
    return NextResponse.json({ error: "Failed to sync attendance." }, { status: 500 });
  }
}
