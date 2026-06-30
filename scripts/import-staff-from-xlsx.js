#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");

const repoRoot = process.cwd();
const fileArg = process.argv[2];

if (!fileArg) {
  console.error("Usage: node scripts/import-staff-from-xlsx.js <path-to-xlsx>");
  process.exit(1);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
  return out;
}

function cellToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (Number.isFinite(value) && Math.abs(value) >= 1e9) return value.toFixed(0);
    return String(value);
  }
  return String(value).trim();
}

function normalizeRole(value) {
  const raw = cellToString(value).toLowerCase();
  if (!raw) return "staff";
  if (raw.includes("teacher")) return "teacher";
  if (raw.includes("admin")) return "admin";
  if (raw.includes("staff") || raw.includes("clerk")) return "staff";
  return "other";
}

function normalizeEmployeeType(value) {
  const raw = cellToString(value).toLowerCase().replace(/[\s-]+/g, "");
  if (!raw || raw.includes("full")) return "full_time";
  if (raw.includes("part")) return "part_time";
  if (raw.includes("contract")) return "contract";
  if (raw.includes("temp")) return "temporary";
  return "full_time";
}

function parseJoiningDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const text = cellToString(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/\s]+(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function mapRow(raw, rowNumber) {
  const fullName = cellToString(raw["Full Name"] ?? raw["full_name"]);
  if (!fullName) return { error: "Full name is required." };
  if (fullName.toLowerCase() === "john doe") return { skip: "Sample row ignored." };

  const emailRaw = cellToString(raw.Email ?? raw.email);
  return {
    rowNumber,
    employee_id: `EMP-${new Date().getFullYear()}-${String(Date.now() + rowNumber).slice(-6)}`,
    full_name: fullName,
    email: emailRaw ? emailRaw.toLowerCase() : null,
    phone_number: cellToString(raw["Phone Number"] ?? raw.phone_number) || null,
    address: cellToString(raw.Address ?? raw.address) || null,
    aadhaar: cellToString(raw.Aadhaar ?? raw.aadhaar) || null,
    pan: cellToString(raw.PAN ?? raw.pan).toUpperCase() || null,
    role: normalizeRole(raw.Role ?? raw.role),
    employee_type: normalizeEmployeeType(raw["Employee Type"] ?? raw.employee_type),
    joining_date: parseJoiningDate(raw["Joining Date"] ?? raw.joining_date),
    status: "active",
  };
}

async function main() {
  const env = parseEnvFile(path.join(repoRoot, ".env.development"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.development");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const { data: existing } = await supabase.from("employees").select("id, email, aadhaar");
  const emailToId = new Map();
  const aadhaarToId = new Map();
  (existing ?? []).forEach((row) => {
    if (row.email) emailToId.set(String(row.email).trim().toLowerCase(), row.id);
    if (row.aadhaar) aadhaarToId.set(String(row.aadhaar).trim(), row.id);
  });

  let imported = 0;
  let duplicates = 0;
  let failed = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const mapped = mapRow(rawRows[i], rowNumber);
    if (mapped.error || mapped.skip) {
      console.log(`Row ${rowNumber}: ${mapped.error || mapped.skip}`);
      continue;
    }

    if (mapped.email && emailToId.has(mapped.email) || mapped.aadhaar && aadhaarToId.has(mapped.aadhaar)) {
      duplicates += 1;
      console.log(`Row ${rowNumber}: duplicate skipped — ${mapped.full_name}`);
      continue;
    }

    const payload = {
      ...mapped,
      degree: cellToString(rawRows[i].Degree ?? rawRows[i].degree) || null,
      institution: cellToString(rawRows[i].Institution ?? rawRows[i].institution) || null,
      year_passed: cellToString(rawRows[i]["Year Passed"] ?? rawRows[i].year_passed)
        ? Number(cellToString(rawRows[i]["Year Passed"] ?? rawRows[i].year_passed))
        : null,
      bank_name: cellToString(rawRows[i]["Bank Name"] ?? rawRows[i].bank_name) || null,
      account_number: cellToString(rawRows[i]["Account Number"] ?? rawRows[i].account_number) || null,
      ifsc_code: cellToString(rawRows[i]["IFSC Code"] ?? rawRows[i].ifsc_code).toUpperCase() || null,
      account_holder_name:
        cellToString(rawRows[i]["Account Holder Name"] ?? rawRows[i].account_holder_name) || mapped.full_name,
      monthly_salary: cellToString(rawRows[i]["Monthly Salary"] ?? rawRows[i].monthly_salary)
        ? Number(cellToString(rawRows[i]["Monthly Salary"] ?? rawRows[i].monthly_salary).replace(/,/g, ""))
        : null,
    };
    delete payload.rowNumber;

    const { data, error } = await supabase.from("employees").insert(payload).select("id, employee_id, full_name").single();
    if (error) {
      failed += 1;
      console.error(`Row ${rowNumber}: FAILED — ${mapped.full_name}: ${error.message}`);
      continue;
    }

    imported += 1;
    console.log(`Row ${rowNumber}: imported ${data.employee_id} — ${data.full_name}`);
    if (mapped.email) emailToId.set(mapped.email, data.id);
    if (mapped.aadhaar) aadhaarToId.set(mapped.aadhaar, data.id);
  }

  console.log(`\nDone. Imported=${imported}, duplicates=${duplicates}, failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
