/**
 * One-command production setup using the local `data_files/` folder.
 *
 * Assumptions (per your confirmation):
 * - academic_years already contains active row for "2025-2026" (status='active')
 * - standards and standard_divisions are empty in prod
 *
 * Steps:
 * 1) npm run db:push
 * 2) Validate emptiness of standards/standard_divisions in prod
 * 3) Insert standards + standard_divisions via manual SQL (non-idempotent; safe since tables empty)
 * 4) Import subjects from Reportcard.xlsx into `subjects` with mark/grade evaluation_type split
 * 5) Import students from each class sheet in data_files/ into `students` + `student_enrollments`
 *
 * Run (from main branch):
 *   npm run setup:prod-from-data-files
 *
 * Optional:
 *   npm run setup:prod-from-data-files -- --data-dir d:\\...\\data_files
 */

import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

import { getRepoRoot, loadEnvFile, getCurrentBranch } from "./lib/student-import-shared";

const repoRoot = getRepoRoot();

function parseArgs(): { dataDir: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  const dataDirDefault = join(repoRoot, "data_files");
  let dataDir = dataDirDefault;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--data-dir") {
      dataDir = args[i + 1] ?? dataDir;
      i++;
      continue;
    }
    if (a.startsWith("--data-dir=")) {
      dataDir = a.split("=", 2)[1];
      continue;
    }
  }
  return { dataDir, dryRun };
}

async function validateProdState(supabase: ReturnType<typeof createClient>) {
  const { data: standardsCount, error: scErr } = await supabase
    .from("standards")
    .select("id", { count: "exact", head: true });
  if (scErr) throw scErr;

  const { data: divisionsCount, error: sdErr } = await supabase
    .from("standard_divisions")
    .select("id", { count: "exact", head: true });
  if (sdErr) throw sdErr;

  // Supabase count is returned in response headers; in JS it comes as `count` only.
  // So we re-run using `count` explicitly:
  const { count: standardsTotal, error: scErr2 } = await supabase
    .from("standards")
    .select("id", { count: "exact" })
    .limit(0);
  if (scErr2) throw scErr2;

  const { count: divisionsTotal, error: sdErr2 } = await supabase
    .from("standard_divisions")
    .select("id", { count: "exact" })
    .limit(0);
  if (sdErr2) throw sdErr2;

  const { count: subjectsTotal, error: stErr } = await supabase.from("subjects").select("id", { count: "exact" }).limit(0);
  if (stErr) throw stErr;

  const { data: activeYears, error: ayErr } = await supabase
    .from("academic_years")
    .select("id,name,status")
    .eq("status", "active");
  if (ayErr) throw ayErr;

  return { standardsTotal, divisionsTotal, subjectsTotal: subjectsTotal ?? 0, activeYears: activeYears ?? [] };
}

async function main() {
  const { dataDir, dryRun } = parseArgs();
  if (!existsSync(dataDir)) throw new Error(`dataDir not found: ${dataDir}`);
  const reportcardPath = join(dataDir, "Reportcard.xlsx");
  if (!existsSync(reportcardPath)) throw new Error(`Reportcard not found: ${reportcardPath}`);

  const branch = getCurrentBranch(repoRoot);
  if (branch !== "main") {
    throw new Error(`Run this from the 'main' branch. Current branch: ${branch ?? "unknown"}`);
  }

  // Load env for supabase client
  const branchFile = ".env.main";
  const branchEnv = loadEnvFile(branchFile);
  const localEnv = loadEnvFile(".env.local");
  Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
  Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.main/.env.local`);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("=== Prod setup ===");
  console.log("Data dir:", dataDir);
  console.log("Reportcard:", reportcardPath);

  if (dryRun) {
    console.log("Dry-run mode: no db writes will be performed by this orchestrator.");
  }

  // 1) db push
  if (!dryRun) {
    console.log("\n[1/5] db:push");
    execSync("npm run db:push", { stdio: "inherit", cwd: repoRoot });
  }

  // 2) Validate prod state (standards/divisions empty, active academic year exists)
  console.log("\n[2/5] Validate prod state");
  const { standardsTotal, divisionsTotal, activeYears } = await validateProdState(supabase);
  console.log("standards:", standardsTotal, "standard_divisions:", divisionsTotal);
  if ((standardsTotal ?? 0) !== 0 || (divisionsTotal ?? 0) !== 0) {
    throw new Error(`Expected standards/standard_divisions to be empty in prod. Found standards=${standardsTotal}, standard_divisions=${divisionsTotal}.`);
  }
  if ((activeYears ?? []).length === 0) {
    throw new Error("Expected an academic year with status='active' in prod, but none found.");
  }
  console.log("active academic years:", (activeYears ?? []).map((y) => y.name).join(", "));

  // 3) Insert standards + divisions (manual SQL)
  if (!dryRun) {
    console.log("\n[3/5] Insert standards + standard_divisions");
    execSync(
      "node scripts/by-branch.js db query --linked -f supabase/manual/insert_standards_prod.sql -o table",
      { stdio: "inherit", cwd: repoRoot }
    );
    execSync(
      "node scripts/by-branch.js db query --linked -f supabase/manual/insert_standard_divisions_prod.sql -o table",
      { stdio: "inherit", cwd: repoRoot }
    );
  }

  // 4) Import subjects from Reportcard
  if (!dryRun) {
    console.log("\n[4/5] Import subjects from Reportcard.xlsx");
    execSync(
      `npx tsx scripts/import-subjects-from-reportcard.ts --reportcard \"${reportcardPath}\"`,
      { stdio: "inherit", cwd: repoRoot }
    );
  }

  // 5) Import students
  if (!dryRun) {
    console.log("\n[5/5] Import students from class files");
    const entries = readdirSync(dataDir);
    const xlsFiles = entries
      .filter((n) => /\.(xls|xlsx)$/i.test(n))
      .filter((n) => n !== "Reportcard.xlsx");

    // Import Class-11 with explicit XI/A first (still safe order)
    const class11 = xlsFiles.find((n) => n.toLowerCase() === "class-11.xlsx");
    if (class11) {
      execSync(
        `npx tsx scripts/import-students-from-aems-xls-direct.ts \"${join(dataDir, class11)}\" --standard XI --division A`,
        { stdio: "inherit", cwd: repoRoot }
      );
    }

    const otherFiles = xlsFiles.filter((n) => n !== class11).filter((n) => n.toLowerCase().includes("student-list"));
    otherFiles.sort();
    for (const file of otherFiles) {
      console.log(`Importing: ${file}`);
      execSync(
        `npx tsx scripts/import-students-from-aems-xls-direct.ts \"${join(dataDir, file)}\"`,
        { stdio: "inherit", cwd: repoRoot }
      );
    }
  }

  console.log("\n=== Prod setup completed ===");
}

main().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});

