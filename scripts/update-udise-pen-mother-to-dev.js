#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const repoRoot = process.cwd();
const dataDir = path.resolve(__dirname, "../../Data From School");
const udiseFile = path.join(dataDir, "UDISE+Students List- 2025-26.xlsx");
const appFile = path.join(dataDir, "students-report (9).xlsx");

const CLASS_MAP = {
  "Nursery/KG": "Junior KG (LKG)",
  "LKG/KG1/Pre-School": "Senior KG (UKG)",
  "UKG/KG2/Pre-Primary": "I",
  "I": "II",
  "II": "III",
  "III": "IV",
  "IV": "V",
  "V": "VI",
  "VI": "VII",
  "VII": "VIII",
  "VIII": "IX",
  "IX": "X",
  "X": "XI Science",
  "XI": "XII Science",
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
  return out;
}

function norm(s) {
  return (s || "").toUpperCase().replace(/\s+/g, " ").trim();
}

function sortedWords(s) {
  return norm(s).split(" ").sort().join(" ");
}

function wordsSet(s) {
  return new Set(norm(s).split(" ").filter(Boolean));
}

function wordOverlap(a, b) {
  const sa = wordsSet(a);
  const sb = wordsSet(b);
  let overlap = 0;
  for (const w of sa) if (sb.has(w)) overlap++;
  return overlap / Math.max(sa.size, sb.size);
}

function loadUdise() {
  const wb = XLSX.readFile(udiseFile);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(5);
  return rows
    .filter((r) => r[0] && r[2])
    .map((r) => ({
      udiseClass: String(r[0]).trim(),
      name: String(r[2]).trim(),
      pen: String(r[3] || "").trim(),
      fatherName: String(r[5] || "").trim(),
      motherName: String(r[6] || "").trim(),
    }));
}

function loadApp() {
  const wb = XLSX.readFile(appFile);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map((r) => ({
    standard: String(r["Standard"] || "").trim(),
    name: String(r["Full Name"] || "").trim(),
    fatherName: String(r["Father Name"] || "").trim(),
    motherName: String(r["Mother Name"] || "").trim(),
    id: String(r["Id"] || "").trim(),
    pen: String(r["Pen No"] || "").trim(),
  }));
}

function findMatch(udiseStudent, appStudents) {
  const mappedStd = CLASS_MAP[udiseStudent.udiseClass];
  if (!mappedStd) return null;
  const candidates = appStudents.filter((a) => a.standard === mappedStd);
  if (!candidates.length) return null;

  const uNorm = norm(udiseStudent.name);
  const uSorted = sortedWords(udiseStudent.name);
  let best = null;
  let bestScore = 0;

  for (const c of candidates) {
    const cNorm = norm(c.name);
    const cSorted = sortedWords(c.name);
    if (uNorm === cNorm) return c;
    if (uSorted === cSorted) {
      if (!best || bestScore < 0.95) {
        best = c;
        bestScore = 0.95;
      }
      continue;
    }
    const overlap = wordOverlap(udiseStudent.name, c.name);
    const fatherMatch = norm(udiseStudent.fatherName) === norm(c.fatherName) ||
      norm(udiseStudent.fatherName).includes(norm(c.fatherName)) ||
      norm(c.fatherName).includes(norm(udiseStudent.fatherName));
    const score = overlap + (fatherMatch ? 0.3 : 0);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  return bestScore >= 0.6 ? best : null;
}

async function main() {
  const envDev = parseEnvFile(path.join(repoRoot, ".env.development"));
  const devUrl = envDev.NEXT_PUBLIC_SUPABASE_URL;
  const devKey = envDev.SUPABASE_SERVICE_ROLE_KEY;
  if (!devUrl || !devKey) throw new Error("Missing dev API URL / service role key in .env.development");

  const dev = createClient(devUrl, devKey, { auth: { persistSession: false } });
  const udise = loadUdise();
  const app = loadApp();

  let matched = 0;
  let unmatched = 0;
  let penUpdated = 0;
  let penFailed = 0;
  let motherUpdated = 0;
  let motherFailed = 0;

  const usedAppIds = new Set();

  for (const u of udise) {
    const match = findMatch(u, app.filter((a) => !usedAppIds.has(a.id)));
    if (!match) {
      unmatched += 1;
      continue;
    }
    usedAppIds.add(match.id);
    matched += 1;

    const updates = {};
    if (!norm(match.pen) && norm(u.pen)) updates.pen_no = u.pen;
    if (!norm(match.motherName) && norm(u.motherName)) updates.mother_name = u.motherName;
    if (Object.keys(updates).length === 0) continue;

    const { error } = await dev.from("students").update(updates).eq("id", match.id);
    if (error) {
      if (Object.prototype.hasOwnProperty.call(updates, "pen_no")) penFailed += 1;
      if (Object.prototype.hasOwnProperty.call(updates, "mother_name")) motherFailed += 1;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "pen_no")) penUpdated += 1;
    if (Object.prototype.hasOwnProperty.call(updates, "mother_name")) motherUpdated += 1;
  }

  console.log(`Matched students:        ${matched}`);
  console.log(`Unmatched UDISE rows:    ${unmatched}`);
  console.log(`PEN updated:             ${penUpdated}`);
  console.log(`PEN update failed:       ${penFailed}`);
  console.log(`Mother name updated:     ${motherUpdated}`);
  console.log(`Mother name failed:      ${motherFailed}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

