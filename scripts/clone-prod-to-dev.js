#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const repoRoot = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
const cloneRoot = path.join(repoRoot, "Clone");
const exportDir = path.join(cloneRoot, timestamp);
const DEFAULT_DEV_PASSWORD = "Angel@123";

const PUBLIC_TABLES = [
  "academic_years",
  "employee_attendance_approvals",
  "employee_attendance_daily",
  "employee_attendance_punches",
  "employee_salaries",
  "employees",
  "exam_result_subjects",
  "exam_subjects",
  "exams",
  "expense_budgets",
  "expense_heads",
  "expenses",
  "fee_collections",
  "fee_structure_items",
  "fee_structures",
  "holidays",
  "profile_allowed_classes",
  "profiles",
  "salary_allowance_items",
  "salary_deduction_items",
  "school_settings",
  "shifts",
  "standard_divisions",
  "standards",
  "student_documents",
  "student_enrollments",
  "student_photos",
  "students",
  "subjects",
];

const INSERT_ORDER = [
  "auth.users",
  "public.profiles",
  "public.school_settings",
  "public.academic_years",
  "public.standards",
  "public.standard_divisions",
  "public.profile_allowed_classes",
  "public.subjects",
  "public.employees",
  "public.shifts",
  "public.holidays",
  "public.students",
  "public.student_enrollments",
  "public.student_documents",
  "public.student_photos",
  "public.exams",
  "public.exam_subjects",
  "public.exam_result_subjects",
  "public.fee_structures",
  "public.fee_structure_items",
  "public.fee_collections",
  "public.expense_heads",
  "public.expense_budgets",
  "public.expenses",
  "public.employee_attendance_daily",
  "public.employee_attendance_punches",
  "public.employee_attendance_approvals",
  "public.employee_salaries",
  "public.salary_deduction_items",
  "public.salary_allowance_items",
];

const MIME_MAP = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".json": "application/json",
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

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runSupabase(args) {
  const cmd = `npx supabase ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`;
  const result = spawnSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Supabase CLI failed: ${cmd}`);
}

async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`Error reading ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function fetchAllAuthUsers(client) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Error listing auth users page ${page}: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function deleteAllAuthUsers(client) {
  const users = await fetchAllAuthUsers(client);
  for (const u of users) {
    const { error } = await client.auth.admin.deleteUser(u.id);
    if (error) console.warn(`  Warning: delete auth user ${u.id}: ${error.message}`);
  }
  return users.length;
}

async function insertPublicRows(client, table, rows) {
  if (!rows.length) return { inserted: 0, failed: 0 };
  let inserted = 0;
  let failed = 0;
  const pageSize = 500;
  for (let i = 0; i < rows.length; i += pageSize) {
    const chunk = rows.slice(i, i + pageSize);
    const { error } = await client.from(table).insert(chunk);
    if (error) {
      console.warn(`  FAIL ${table} batch ${i}-${i + chunk.length}: ${error.message}`);
      failed += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }
  return { inserted, failed };
}

function walkDir(dir, prefix) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    const full = path.join(dir, entry.name);
    const storagePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walkDir(full, storagePath));
    else files.push({ localPath: full, storagePath });
  }
  return files;
}

async function main() {
  const envMain = parseEnvFile(path.join(repoRoot, ".env.main"));
  const envDev = parseEnvFile(path.join(repoRoot, ".env.development"));

  const prodUrl = envMain.NEXT_PUBLIC_SUPABASE_URL;
  const prodKey = envMain.SUPABASE_SERVICE_ROLE_KEY;
  const devUrl = envDev.NEXT_PUBLIC_SUPABASE_URL;
  const devKey = envDev.SUPABASE_SERVICE_ROLE_KEY;
  const devRef = envDev.SUPABASE_PROJECT_REF;
  const devDbPassword = process.env.SUPABASE_DB_PASSWORD_DEVELOPMENT || envDev.SUPABASE_DB_PASSWORD;

  if (!prodUrl || !prodKey) throw new Error("Missing prod API URL / service role key in .env.main");
  if (!devUrl || !devKey) throw new Error("Missing dev API URL / service role key in .env.development");
  if (!devRef) throw new Error("Missing SUPABASE_PROJECT_REF in .env.development");
  if (!devDbPassword) throw new Error("Missing SUPABASE_DB_PASSWORD_DEVELOPMENT env var or SUPABASE_DB_PASSWORD in .env.development");

  const prod = createClient(prodUrl, prodKey, { auth: { persistSession: false } });
  const dev = createClient(devUrl, devKey, { auth: { persistSession: false } });

  // ── STEP 1: Export prod data ──────────────────────────────────────────
  console.log("=".repeat(60));
  console.log("STEP 1: Export all data from prod");
  console.log("=".repeat(60));

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  console.log("Exporting auth.users...");
  const authUsers = await fetchAllAuthUsers(prod);
  writeJson(path.join(exportDir, "auth.users.json"), authUsers);
  console.log(`  auth.users: ${authUsers.length} rows`);

  for (const table of PUBLIC_TABLES) {
    process.stdout.write(`Exporting public.${table}...`);
    const rows = await fetchAllRows(prod, table);
    writeJson(path.join(exportDir, `public.${table}.json`), rows);
    console.log(` ${rows.length} rows`);
  }

  console.log("Exporting storage buckets...");
  const { data: buckets, error: bucketsErr } = await prod.storage.listBuckets();
  if (bucketsErr) {
    console.warn(`  Warning: could not list buckets: ${bucketsErr.message}`);
  } else {
    const storageDir = path.join(exportDir, "storage");
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    writeJson(path.join(storageDir, "_buckets.json"), buckets);
    for (const bucket of buckets) {
      const bucketDir = path.join(storageDir, bucket.id);
      if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir, { recursive: true });
      let fileCount = 0;
      async function downloadFolder(folderPath) {
        const { data: items, error: listErr } = await prod.storage.from(bucket.id).list(folderPath, { limit: 1000 });
        if (listErr) return;
        for (const item of items || []) {
          const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
          if (item.id === null) { await downloadFolder(itemPath); continue; }
          const { data: blob, error: dlErr } = await prod.storage.from(bucket.id).download(itemPath);
          if (dlErr) continue;
          const localDir = path.join(bucketDir, folderPath || "");
          if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
          fs.writeFileSync(path.join(localDir, item.name), Buffer.from(await blob.arrayBuffer()));
          fileCount += 1;
        }
      }
      await downloadFolder("");
      console.log(`  ${bucket.id}: ${fileCount} files`);
    }
  }

  // ── STEP 2: Flush dev ─────────────────────────────────────────────────
  console.log("");
  console.log("=".repeat(60));
  console.log("STEP 2: Flush all dev data");
  console.log("=".repeat(60));

  console.log("Deleting dev auth users...");
  const deletedCount = await deleteAllAuthUsers(dev);
  console.log(`  Deleted ${deletedCount} auth users`);

  console.log("Linking dev project for SQL flush...");
  runSupabase(["link", "--project-ref", devRef, "--password", devDbPassword]);

  console.log("Flushing auth tables...");
  runSupabase(["db", "query", "--linked", "TRUNCATE TABLE auth.users CASCADE; DELETE FROM auth.flow_state;"]);

  console.log("Flushing public tables...");
  const truncateSql = `TRUNCATE TABLE ${PUBLIC_TABLES.map((t) => `public.${t}`).join(", ")} RESTART IDENTITY CASCADE;`;
  runSupabase(["db", "query", "--linked", truncateSql]);
  console.log("  Dev flushed.");

  // ── STEP 3: Import into dev ───────────────────────────────────────────
  console.log("");
  console.log("=".repeat(60));
  console.log("STEP 3: Import data into dev");
  console.log("=".repeat(60));

  const summary = {};

  for (const qualifiedTable of INSERT_ORDER) {
    const rows = readJson(path.join(exportDir, `${qualifiedTable}.json`));
    if (rows.length === 0) { summary[qualifiedTable] = { rows: 0, ok: 0, fail: 0 }; continue; }

    process.stdout.write(`Importing ${qualifiedTable} (${rows.length} rows)...`);

    if (qualifiedTable === "auth.users") {
      let created = 0, failed = 0;
      for (const src of rows) {
        const { data, error } = await dev.auth.admin.createUser({
          id: src.id,
          email: src.email || undefined,
          phone: src.phone || undefined,
          password: DEFAULT_DEV_PASSWORD,
          email_confirm: !!src.email_confirmed_at,
          phone_confirm: !!src.phone_confirmed_at,
          user_metadata: src.user_metadata || {},
          app_metadata: src.app_metadata || {},
        });
        if (error || data?.user?.id !== src.id) { failed += 1; } else { created += 1; }
      }
      summary[qualifiedTable] = { rows: rows.length, ok: created, fail: failed };
      console.log(` created=${created}, failed=${failed}`);
      await dev.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    } else if (qualifiedTable === "public.student_enrollments") {
      const pass1 = rows.map((r) => ({ ...r, promoted_from_enrollment_id: null }));
      const result = await insertPublicRows(dev, "student_enrollments", pass1);
      const withPromo = rows.filter((r) => r.promoted_from_enrollment_id);
      let promoFail = 0;
      for (const row of withPromo) {
        const { error } = await dev.from("student_enrollments")
          .update({ promoted_from_enrollment_id: row.promoted_from_enrollment_id }).eq("id", row.id);
        if (error) promoFail += 1;
      }
      summary[qualifiedTable] = { rows: rows.length, ok: result.inserted, fail: result.failed + promoFail };
      console.log(` inserted=${result.inserted}, promos=${withPromo.length}, failed=${result.failed + promoFail}`);

    } else {
      const tableName = qualifiedTable.replace("public.", "");
      const result = await insertPublicRows(dev, tableName, rows);
      summary[qualifiedTable] = { rows: rows.length, ok: result.inserted, fail: result.failed };
      console.log(` inserted=${result.inserted}, failed=${result.failed}`);
    }
  }

  console.log("\nSetting default password for all dev users...");
  const devUsers = await fetchAllAuthUsers(dev);
  let pwSet = 0;
  for (const u of devUsers) {
    const { error } = await dev.auth.admin.updateUserById(u.id, { password: DEFAULT_DEV_PASSWORD });
    if (!error) pwSet += 1;
  }
  console.log(`  Password set for ${pwSet}/${devUsers.length} users (password: ${DEFAULT_DEV_PASSWORD})`);

  const storageDir = path.join(exportDir, "storage");
  if (fs.existsSync(path.join(storageDir, "_buckets.json"))) {
    const storageBuckets = JSON.parse(fs.readFileSync(path.join(storageDir, "_buckets.json"), "utf8"));
    console.log(`\nImporting storage (${storageBuckets.length} buckets)...`);
    for (const bucket of storageBuckets) {
      const bucketDir = path.join(storageDir, bucket.id);
      if (!fs.existsSync(bucketDir)) continue;
      const { data: existing } = await dev.storage.listBuckets();
      if (!(existing || []).some((b) => b.id === bucket.id)) {
        await dev.storage.createBucket(bucket.id, {
          public: bucket.public || false,
          fileSizeLimit: bucket.file_size_limit || undefined,
          allowedMimeTypes: bucket.allowed_mime_types || undefined,
        });
      }
      const files = walkDir(bucketDir, "");
      let uploaded = 0;
      for (const file of files) {
        const buf = fs.readFileSync(file.localPath);
        const contentType = MIME_MAP[path.extname(file.storagePath).toLowerCase()] || "application/octet-stream";
        const { error } = await dev.storage.from(bucket.id).upload(file.storagePath, buf, { upsert: true, contentType });
        if (!error) uploaded += 1;
      }
      console.log(`  ${bucket.id}: ${uploaded}/${files.length} files`);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────
  console.log("");
  console.log("=".repeat(60));
  const totalRows = Object.values(summary).reduce((s, v) => s + v.rows, 0);
  const totalOk = Object.values(summary).reduce((s, v) => s + v.ok, 0);
  const totalFail = Object.values(summary).reduce((s, v) => s + v.fail, 0);
  console.log(`CLONE COMPLETE. rows=${totalRows}, inserted=${totalOk}, failed=${totalFail}`);
  console.log("=".repeat(60));

  writeJson(path.join(exportDir, "_clone-result.json"), summary);
  console.log(`Backup saved to: ${exportDir}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
