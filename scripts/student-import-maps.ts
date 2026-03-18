/**
 * Build reference maps for student import (academic years, standards, standard_divisions).
 * Reports every map failure; does not skip. Exit with code 1 if any map fails.
 * See docs/student-excel-import-approach.md.
 *
 * Run: npx tsx scripts/student-import-maps.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  getRepoRoot,
  loadEnvFile,
  getCurrentBranch,
  buildStudentImportMaps,
} from "./lib/student-import-shared";

const repoRoot = getRepoRoot();

async function main(): Promise<void> {
  const branch = getCurrentBranch(repoRoot);
  const branchFile = branch === "main" ? ".env.main" : ".env.development";
  const branchEnv = loadEnvFile(repoRoot, branchFile);
  const localEnv = loadEnvFile(repoRoot, ".env.local");
  Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
  Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.log("\n=== Student import maps ===\n");
    console.log("Map failures (fix these before running import; nothing was skipped):\n");
    console.log(
      "  •",
      `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${branchFile} or .env.local.`
    );
    console.log("");
    process.exit(1);
  }

  console.log("Using Supabase from", branch ? `${branch} (${branchFile})` : ".env.local");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { academicYearByName, standardByName, divisionByStandardIdAndName, divisionByStandardNameAndName, academicYearRows, failures } =
    await buildStudentImportMaps(supabase);

  console.log("\n=== Student import maps ===\n");

  if (failures.length > 0) {
    console.log("Map failures (fix these before running import; nothing was skipped):\n");
    failures.forEach((f) => console.log("  •", f));
    console.log("");
    process.exit(1);
  }

  console.log("All maps OK. Summary:\n");
  console.log("  academic_years:     ", academicYearByName.size, "entries (name → id)");
  console.log("  standards:          ", standardByName.size, "entries (name → id)");
  console.log(
    "  standard_divisions: ",
    divisionByStandardIdAndName.size,
    "entries (standard_id:division_name → id)"
  );
  console.log("");
  console.log("Academic years (name → id):");
  academicYearByName.forEach((id, name) => {
    const row = academicYearRows.find((r) => r.id === id);
    const status = row?.status ?? "";
    console.log(`  ${name} → ${id} ${status ? `(${status})` : ""}`);
  });
  console.log("");
  console.log("Standards (name → id):");
  standardByName.forEach((id, name) => console.log(`  ${name} → ${id}`));
  console.log("");
  console.log("Divisions (standard_name:division_name → id):");
  divisionByStandardNameAndName.forEach((id, key) => console.log(`  ${key} → ${id}`));
  console.log("");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
