#!/usr/bin/env node
"use strict";

const XLSX = require("xlsx");
const path = require("path");

const dataDir = path.resolve(__dirname, "../../Data From School");
const udiseFile = path.join(dataDir, "UDISE+Students List- 2025-26.xlsx");
const appFile = path.join(dataDir, "students-report (9).xlsx");
const outFile = path.join(dataDir, "name-mismatch-udise-vs-app.xlsx");
const outFileFallback = path.join(
  dataDir,
  `name-mismatch-udise-vs-app-${new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)}.xlsx`
);

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
      section: String(r[1] || "").trim(),
      name: String(r[2]).trim(),
      pen: String(r[3] || "").trim(),
      gender: String(r[4] || "").trim(),
      fatherName: String(r[5] || "").trim(),
      motherName: String(r[6] || "").trim(),
    }));
}

function loadApp() {
  const wb = XLSX.readFile(appFile);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map((r) => ({
    standard: String(r["Standard"] || "").trim(),
    division: String(r["Division"] || "").trim(),
    rollNo: r["Roll Number"],
    grNo: String(r["Gr Number"] || "").trim(),
    name: String(r["Full Name"] || "").trim(),
    fatherName: String(r["Father Name"] || "").trim(),
    motherName: String(r["Mother Name"] || "").trim(),
    id: String(r["Id"] || "").trim(),
    pen: String(r["Pen No"] || "").trim(),
    aadhar: String(r["Aadhar No"] || "").trim(),
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

    if (uNorm === cNorm) return { match: c, confidence: "exact" };

    if (uSorted === cSorted) {
      if (!best || bestScore < 0.95) { best = c; bestScore = 0.95; }
      continue;
    }

    const overlap = wordOverlap(udiseStudent.name, c.name);
    const fatherMatch = norm(udiseStudent.fatherName) === norm(c.fatherName) ||
      norm(udiseStudent.fatherName).includes(norm(c.fatherName)) ||
      norm(c.fatherName).includes(norm(udiseStudent.fatherName));

    const score = overlap + (fatherMatch ? 0.3 : 0);
    if (score > bestScore) { best = c; bestScore = score; }
  }

  if (bestScore >= 0.6) {
    return { match: best, confidence: bestScore >= 0.95 ? "reordered" : bestScore >= 0.8 ? "high" : "medium" };
  }
  return null;
}

function main() {
  const udise = loadUdise();
  const app = loadApp();

  console.log(`UDISE students: ${udise.length}`);
  console.log(`App students:   ${app.length}`);

  const matched = [];
  const mismatched = [];
  const unmatched = [];
  const usedAppIds = new Set();

  for (const u of udise) {
    const result = findMatch(u, app.filter((a) => !usedAppIds.has(a.id)));
    if (!result) {
      unmatched.push(u);
      continue;
    }

    usedAppIds.add(result.match.id);
    const appName = result.match.name;
    const udiseName = u.name;

    if (norm(appName) === norm(udiseName)) {
      matched.push({ u, app: result.match, confidence: result.confidence });
    } else {
      mismatched.push({ u, app: result.match, confidence: result.confidence });
    }

  }

  console.log(`\nExact matches (name identical):  ${matched.length}`);
  console.log(`Name mismatches (to review):     ${mismatched.length}`);
  console.log(`Unmatched UDISE students:        ${unmatched.length}`);

  const mismatchRows = mismatched.map((m) => ({
    "Student ID": m.app.id,
    "GR No": m.app.grNo,
    "UDISE Class": m.u.udiseClass,
    "App Standard": m.app.standard,
    "App Division": m.app.division,
    "Current Name (App)": m.app.name,
    "Correct Name (UDISE)": m.u.name,
    "App Father Name": m.app.fatherName,
    "UDISE Father Name": m.u.fatherName,
    "App Mother Name": m.app.motherName,
    "UDISE Mother Name": m.u.motherName,
    "UDISE PEN": m.u.pen,
    "Match Confidence": m.confidence,
  }));

  const unmatchedRows = unmatched.map((u) => ({
    "UDISE Class": u.udiseClass,
    "Mapped App Standard": CLASS_MAP[u.udiseClass] || "?",
    "UDISE Name": u.name,
    "UDISE Father Name": u.fatherName,
    "UDISE PEN": u.pen,
    "Note": "No match found in app",
  }));

  const wb = XLSX.utils.book_new();

  if (mismatchRows.length) {
    const ws1 = XLSX.utils.json_to_sheet(mismatchRows);
    ws1["!cols"] = [
      { wch: 38 }, { wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 10 },
      { wch: 40 }, { wch: 40 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Name Mismatches");
  }

  if (unmatchedRows.length) {
    const ws2 = XLSX.utils.json_to_sheet(unmatchedRows);
    ws2["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Unmatched UDISE");
  }

  try {
    XLSX.writeFile(wb, outFile);
    console.log(`\nOutput written to: ${outFile}`);
  } catch (err) {
    if (err && err.code === "EBUSY") {
      XLSX.writeFile(wb, outFileFallback);
      console.log(`\nPrimary file is open/locked. Output written to: ${outFileFallback}`);
    } else {
      throw err;
    }
  }
}

main();
