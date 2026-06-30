import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser, isAdminOrAbove, isPayrollRole } from "@/lib/auth";
import { decodeBiometricFile, parseBiometricLog, type ParsedPunch } from "@/lib/biometric-parse";
import { deriveDailyStatus, DEFAULT_THRESHOLDS, type ShiftLite } from "@/lib/attendance";

export const dynamic = "force-dynamic";

function normalizeEnroll(value: string): string {
  const stripped = value.trim().replace(/^0+/, "");
  return stripped === "" ? "0" : stripped;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminOrAbove(user) && !isPayrollRole(user)) {
      return NextResponse.json({ error: "You do not have permission to import attendance." }, { status: 403 });
    }

    const formData = await request.formData();
    const monthYear = String(formData.get("monthYear") ?? "");
    const file = formData.get("file");

    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Please attach the biometric log file." }, { status: 400 });
    }

    const fileName = (file as File).name ?? "attendance.txt";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const content = decodeBiometricFile(bytes);
    const parsed = parseBiometricLog(content);

    if (!parsed.headerOk) {
      return NextResponse.json(
        { error: "Could not recognise the file format. Expected a tab-delimited log with EnNo, In/Out and DateTime columns." },
        { status: 400 }
      );
    }

    // Only keep punches that fall inside the selected month.
    const inMonth = parsed.punches.filter((p) => p.date.slice(0, 7) === monthYear);

    const supabase = await createClient();

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, shift_id, biometric_enroll_no");

    const enrollToEmp = new Map<string, { id: string; shift_id: string | null }>();
    (employees ?? []).forEach((e) => {
      if (e.biometric_enroll_no) {
        enrollToEmp.set(normalizeEnroll(String(e.biometric_enroll_no)), { id: e.id, shift_id: e.shift_id ?? null });
      }
    });

    const { data: shifts } = await supabase
      .from("shifts")
      .select("id, start_time, end_time, grace_period_minutes, late_threshold_minutes, early_departure_threshold_minutes");
    const shiftMap = new Map<string, ShiftLite>();
    (shifts ?? []).forEach((s) => shiftMap.set(s.id, s));

    const { data: settings } = await supabase
      .from("payroll_settings")
      .select("full_day_hours, half_day_hours")
      .eq("id", 1)
      .maybeSingle();
    const thresholds = {
      fullDayHours: Number(settings?.full_day_hours ?? DEFAULT_THRESHOLDS.fullDayHours),
      halfDayHours: Number(settings?.half_day_hours ?? DEFAULT_THRESHOLDS.halfDayHours),
    };

    // Map punches to employees; collect unmapped enrollment numbers.
    const unmapped = new Map<string, number>();
    const mappedEmpIds = new Set<string>();
    type DbPunch = {
      employee_id: string;
      punch_date: string;
      punch_time: string;
      punch_type: string;
      is_late: boolean;
      is_early_departure: boolean;
      source: string;
    };
    const punchRows: DbPunch[] = [];
    // group raw punches per employee+date for daily derivation
    const groups = new Map<string, { empId: string; shiftId: string | null; date: string; items: ParsedPunch[] }>();

    for (const p of inMonth) {
      const emp = enrollToEmp.get(p.enNoNorm);
      if (!emp) {
        unmapped.set(p.enNo, (unmapped.get(p.enNo) ?? 0) + 1);
        continue;
      }
      mappedEmpIds.add(emp.id);
      const key = `${emp.id}::${p.date}`;
      const g = groups.get(key);
      if (g) g.items.push(p);
      else groups.set(key, { empId: emp.id, shiftId: emp.shift_id, date: p.date, items: [p] });
    }

    // Build punch rows with late/early flags derived per day.
    for (const g of groups.values()) {
      const shift = g.shiftId ? shiftMap.get(g.shiftId) ?? null : null;
      const derived = deriveDailyStatus(
        g.items.map((i) => ({ punch_type: i.punchType, punch_time: i.punchTimeISO })),
        shift,
        thresholds
      );
      const ins = g.items.filter((i) => i.punchType === "IN").sort((a, b) => a.punchTimeISO.localeCompare(b.punchTimeISO));
      const outs = g.items.filter((i) => i.punchType === "OUT").sort((a, b) => a.punchTimeISO.localeCompare(b.punchTimeISO));
      const firstInIso = ins[0]?.punchTimeISO;
      const lastOutIso = outs[outs.length - 1]?.punchTimeISO;

      for (const i of g.items) {
        punchRows.push({
          employee_id: g.empId,
          punch_date: i.date,
          punch_time: i.punchTimeISO,
          punch_type: i.punchType,
          is_late: i.punchType === "IN" && i.punchTimeISO === firstInIso ? derived.is_late : false,
          is_early_departure: i.punchType === "OUT" && i.punchTimeISO === lastOutIso ? derived.is_early_departure : false,
          source: "biometric",
        });
      }
    }

    // Upsert raw punches (idempotent on re-upload).
    let punchesUpserted = 0;
    for (const part of chunk(punchRows, 500)) {
      const { error } = await supabase
        .from("employee_attendance_punches")
        .upsert(part, { onConflict: "employee_id,punch_time,punch_type", ignoreDuplicates: false });
      if (error) {
        return NextResponse.json({ error: `Failed to save punches: ${error.message}` }, { status: 500 });
      }
      punchesUpserted += part.length;
    }

    // Do not clobber rows that an admin already approved or manually edited.
    const start = `${monthYear}-01`;
    const [yy, mm] = monthYear.split("-");
    const lastDay = new Date(parseInt(yy), parseInt(mm), 0).getDate();
    const end = `${monthYear}-${String(lastDay).padStart(2, "0")}`;
    const { data: existingDaily } = await supabase
      .from("employee_attendance_daily")
      .select("employee_id, attendance_date, source, is_approved")
      .gte("attendance_date", start)
      .lte("attendance_date", end);
    const protectedKeys = new Set<string>();
    (existingDaily ?? []).forEach((r) => {
      if (r.is_approved || (r.source && r.source !== "biometric")) {
        protectedKeys.add(`${r.employee_id}::${r.attendance_date}`);
      }
    });

    type DbDaily = {
      employee_id: string;
      attendance_date: string;
      status: string;
      in_time: string | null;
      out_time: string | null;
      month_year: string;
      source: string;
      is_approved: boolean;
    };
    const dailyRows: DbDaily[] = [];
    for (const g of groups.values()) {
      const key = `${g.empId}::${g.date}`;
      if (protectedKeys.has(key)) continue;
      const shift = g.shiftId ? shiftMap.get(g.shiftId) ?? null : null;
      const derived = deriveDailyStatus(
        g.items.map((i) => ({ punch_type: i.punchType, punch_time: i.punchTimeISO })),
        shift,
        thresholds
      );
      dailyRows.push({
        employee_id: g.empId,
        attendance_date: g.date,
        status: derived.status,
        in_time: derived.in_time ?? null,
        out_time: derived.out_time ?? null,
        month_year: monthYear,
        source: "biometric",
        is_approved: false,
      });
    }

    let dailyWritten = 0;
    for (const part of chunk(dailyRows, 500)) {
      const { error } = await supabase
        .from("employee_attendance_daily")
        .upsert(part, { onConflict: "employee_id,attendance_date", ignoreDuplicates: false });
      if (error) {
        return NextResponse.json({ error: `Failed to save daily attendance: ${error.message}` }, { status: 500 });
      }
      dailyWritten += part.length;
    }

    const unmappedList = Array.from(unmapped.entries())
      .map(([enNo, count]) => ({ enNo, count }))
      .sort((a, b) => b.count - a.count);

    await supabase.from("attendance_import_batches").insert({
      month_year: monthYear,
      file_name: fileName,
      rows_parsed: parsed.totalLines,
      rows_mapped: inMonth.length - Array.from(unmapped.values()).reduce((a, b) => a + b, 0),
      punches_upserted: punchesUpserted,
      unmapped_enrolls: unmappedList,
      uploaded_by: user.id,
    });

    return NextResponse.json({
      monthYear,
      fileName,
      totalParsed: parsed.totalLines,
      skippedRows: parsed.skipped,
      punchesInMonth: inMonth.length,
      punchesUpserted,
      mappedEmployees: mappedEmpIds.size,
      dailyWritten,
      unmapped: unmappedList,
    });
  } catch (e) {
    console.error("attendance-import error", e);
    return NextResponse.json({ error: "Failed to import attendance." }, { status: 500 });
  }
}
