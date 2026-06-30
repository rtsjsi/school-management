import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser, isAdminOrAbove, isPayrollRole } from "@/lib/auth";
import { buildEmployeeInsert, parseStaffWorkbook } from "@/lib/staff-import-parse";

export const dynamic = "force-dynamic";

function makeEmployeeCode(index: number): string {
  const year = new Date().getFullYear();
  const suffix = String(Date.now() + index).slice(-6);
  return `EMP-${year}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminOrAbove(user) && !isPayrollRole(user)) {
      return NextResponse.json({ error: "You do not have permission to import staff." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Please attach a staff spreadsheet (.xlsx or .csv)." }, { status: 400 });
    }

    const fileName = (file as File).name ?? "staff.xlsx";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseStaffWorkbook(bytes);

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No importable staff rows found.",
          skipped: parsed.skipped,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: existing } = await supabase.from("employees").select("id, email, aadhaar, full_name");

    const emailToId = new Map<string, string>();
    const aadhaarToId = new Map<string, string>();
    (existing ?? []).forEach((row) => {
      if (row.email) emailToId.set(String(row.email).trim().toLowerCase(), row.id);
      if (row.aadhaar) aadhaarToId.set(String(row.aadhaar).trim(), row.id);
    });

    const inserted: { rowNumber: number; full_name: string; employee_id: string }[] = [];
    const duplicates: { rowNumber: number; full_name: string; reason: string }[] = [];
    const failed: { rowNumber: number; full_name: string; reason: string }[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      if (row.email && emailToId.has(row.email)) {
        duplicates.push({
          rowNumber: row.rowNumber,
          full_name: row.full_name,
          reason: `Email already exists (${row.email}).`,
        });
        continue;
      }
      if (row.aadhaar && aadhaarToId.has(row.aadhaar)) {
        duplicates.push({
          rowNumber: row.rowNumber,
          full_name: row.full_name,
          reason: "Aadhaar already exists.",
        });
        continue;
      }

      const employeeCode = makeEmployeeCode(i);
      const payload = buildEmployeeInsert(row, employeeCode);
      const { data, error } = await supabase.from("employees").insert(payload).select("id, employee_id, full_name").single();

      if (error || !data) {
        failed.push({
          rowNumber: row.rowNumber,
          full_name: row.full_name,
          reason: error?.message ?? "Insert failed.",
        });
        continue;
      }

      inserted.push({
        rowNumber: row.rowNumber,
        full_name: data.full_name,
        employee_id: data.employee_id,
      });
      if (row.email) emailToId.set(row.email, data.id);
      if (row.aadhaar) aadhaarToId.set(row.aadhaar, data.id);
    }

    return NextResponse.json({
      fileName,
      totalRows: parsed.rows.length + parsed.skipped.length,
      imported: inserted.length,
      duplicates,
      failed,
      skipped: parsed.skipped,
      inserted,
    });
  } catch (error) {
    console.error("[employee-import]", error);
    return NextResponse.json({ error: "Staff import failed." }, { status: 500 });
  }
}
