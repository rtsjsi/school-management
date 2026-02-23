#!/usr/bin/env node
"use strict";

/**
 * Clone development database and storage into main: dump dev (auth + public, including profiles),
 * flush main, restore, then copy all storage buckets from dev to main.
 *
 * Prerequisites:
 * - PostgreSQL client tools (pg_dump, psql) on PATH — no Docker required
 * - DEV_DATABASE_URL and MAIN_DATABASE_URL (use Session pooler URI for free tier / IPv4).
 * - For storage copy: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.development
 *   and .env.main (or equivalent) for dev and main projects.
 *
 * Note: To keep existing tokens valid on main, set main project's JWT secret to match dev
 * (Dashboard → Settings → API → JWT Secret). Otherwise users must sign in again.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      user: u.username,
      password: u.password,
      database: u.pathname.slice(1) || "postgres",
    };
  } catch {
    return null;
  }
}
const backupsDir = path.join(repoRoot, "supabase", "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupName = `dev-to-main-${timestamp}`;
const authDataFile = path.join(backupsDir, `${backupName}-auth.sql`);
const publicBackupFile = path.join(backupsDir, `${backupName}-public.sql`);

function loadEnv(fileName) {
  const filePath = path.join(repoRoot, fileName);
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, "").trim();
      out[m[1]] = val;
    }
  }
  return out;
}

const envMain = loadEnv(".env.main");
const envDev = loadEnv(".env.development");
const envProcess = process.env;

function get(name) {
  return envProcess[name] ?? envMain[name] ?? envDev[name] ?? "";
}

const DEV_DATABASE_URL = get("DEV_DATABASE_URL");
const MAIN_DATABASE_URL = get("MAIN_DATABASE_URL");

if (!DEV_DATABASE_URL) {
  console.error(
    "Missing DEV_DATABASE_URL. Set it in .env.development or export it.\n" +
      "Get the URI from Supabase Dashboard → Development project → Connect → Database (URI)."
  );
  process.exit(1);
}
if (!MAIN_DATABASE_URL) {
  console.error(
    "Missing MAIN_DATABASE_URL. Set it in .env.main or export it.\n" +
      "Get the URI from Supabase Dashboard → Main project → Connect → Database (URI)."
  );
  process.exit(1);
}

const devSupabaseUrl = envDev.NEXT_PUBLIC_SUPABASE_URL || envProcess.NEXT_PUBLIC_SUPABASE_URL || "";
const devServiceKey = envDev.SUPABASE_SERVICE_ROLE_KEY || envProcess.SUPABASE_SERVICE_ROLE_KEY || "";
const mainSupabaseUrl = envMain.NEXT_PUBLIC_SUPABASE_URL || "";
const mainServiceKey = envMain.SUPABASE_SERVICE_ROLE_KEY || "";
const doStorage = !!(devSupabaseUrl && devServiceKey && mainSupabaseUrl && mainServiceKey);
if (!doStorage) {
  console.warn(
    "Storage copy skipped: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.development and .env.main to clone storage."
  );
}

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const devConn = parseDbUrl(DEV_DATABASE_URL);
const mainConn = parseDbUrl(MAIN_DATABASE_URL);
if (!devConn || !mainConn) {
  console.error("Invalid DEV_DATABASE_URL or MAIN_DATABASE_URL (must be valid postgresql:// URI).");
  process.exit(1);
}

// On Windows, PostgreSQL is often not on PATH; use default install location if needed
function getPgBinPath() {
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    for (const ver of ["17", "16", "15", "14"]) {
      const bin = path.join(programFiles, "PostgreSQL", ver, "bin");
      if (fs.existsSync(path.join(bin, "pg_dump.exe"))) return bin;
    }
  }
  return "";
}

const pgBinPath = getPgBinPath();
const pathSep = process.platform === "win32" ? ";" : ":";
const envWithDevPass = {
  ...process.env,
  PGPASSWORD: devConn.password,
  ...(pgBinPath ? { PATH: pgBinPath + pathSep + process.env.PATH } : {}),
};
const envWithMainPass = {
  ...process.env,
  PGPASSWORD: mainConn.password,
  ...(pgBinPath ? { PATH: pgBinPath + pathSep + process.env.PATH } : {}),
};

const pgDump = process.platform === "win32" && pgBinPath ? path.join(pgBinPath, "pg_dump.exe") : "pg_dump";
const psql = process.platform === "win32" && pgBinPath ? path.join(pgBinPath, "psql.exe") : "psql";

function runPsql(conn, env, args) {
  const cmd = `"${psql}" -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -v ON_ERROR_STOP=1 ${args}`;
  execSync(cmd, { stdio: "inherit", shell: true, env });
}

/** Recursively list all object paths in a bucket (prefix is folder path, e.g. "" or "photos/"). */
async function listAllObjectPaths(client, bucketName, prefix = "") {
  const { data: items, error } = await client.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths = [];
  for (const item of items || []) {
    const fullPath = prefix ? prefix + item.name : item.name;
    if (item.id != null) {
      paths.push(fullPath);
    } else {
      const nested = await listAllObjectPaths(client, bucketName, fullPath + "/");
      paths.push(...nested);
    }
  }
  return paths;
}

async function copyStorage(devUrl, devKey, mainUrl, mainKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const devClient = createClient(devUrl, devKey);
  const mainClient = createClient(mainUrl, mainKey);

  const { data: buckets, error: listErr } = await devClient.storage.listBuckets();
  if (listErr) throw new Error("List dev buckets: " + listErr.message);
  if (!buckets || buckets.length === 0) {
    console.log("No buckets on dev.");
    return;
  }

  for (const bucket of buckets) {
    const name = bucket.name;
    const isPublic = bucket.public === true;
    const { data: mainBuckets } = await mainClient.storage.listBuckets();
    const existsOnMain = (mainBuckets || []).some((b) => b.name === name);
    if (!existsOnMain) {
      const { error: createErr } = await mainClient.storage.createBucket(name, {
        public: isPublic,
      });
      if (createErr) throw new Error("Create bucket " + name + " on main: " + createErr.message);
      console.log("Created bucket on main:", name);
    }

    const paths = await listAllObjectPaths(devClient, name);
    for (const objectPath of paths) {
      const { data: blob, error: downErr } = await devClient.storage.from(name).download(objectPath);
      if (downErr) throw new Error("Download " + name + "/" + objectPath + ": " + downErr.message);
      const { error: upErr } = await mainClient.storage.from(name).upload(objectPath, blob, {
        upsert: true,
        contentType: blob.type || undefined,
      });
      if (upErr) throw new Error("Upload " + name + "/" + objectPath + ": " + upErr.message);
    }
    console.log("Copied bucket", name, "—", paths.length, "object(s).");
  }
}

console.log("Step 1a: Dump auth.users + auth.identities (data only) from dev — for profiles/user IDs…");
// Only users and identities; full auth dump includes schema_migrations which we cannot write on main
try {
  execSync(
    `"${pgDump}" -h ${devConn.host} -p ${devConn.port} -U ${devConn.user} -d ${devConn.database} --no-owner --no-privileges --data-only -t auth.users -t auth.identities -f "${authDataFile}"`,
    { stdio: "inherit", shell: true, env: envWithDevPass }
  );
} catch (e) {
  console.error("pg_dump (auth) failed.");
  process.exit(1);
}

console.log("Step 1b: Full dump of public schema from dev (including profiles)…");
try {
  execSync(
    `"${pgDump}" -h ${devConn.host} -p ${devConn.port} -U ${devConn.user} -d ${devConn.database} --schema=public --no-owner --no-privileges -f "${publicBackupFile}"`,
    { stdio: "inherit", shell: true, env: envWithDevPass }
  );
} catch (e) {
  console.error("pg_dump (public) failed.");
  process.exit(1);
}
console.log("Backup files:", authDataFile, publicBackupFile);

console.log("\nStep 2: Flush main — drop public schema and clear auth users (so we can restore dev auth + public)…");
runPsql(mainConn, envWithMainPass, `-c "DROP SCHEMA IF EXISTS public CASCADE"`);
runPsql(mainConn, envWithMainPass, `-c "TRUNCATE auth.users CASCADE"`);

console.log("\nStep 3: Restore auth data into main (triggers disabled)…");
runPsql(
  mainConn,
  envWithMainPass,
  `--single-transaction -c "SET session_replication_role = replica" -f "${authDataFile}" -c "SET session_replication_role = DEFAULT"`
);

console.log("\nStep 4: Restore public schema (including profiles) into main…");
runPsql(
  mainConn,
  envWithMainPass,
  `--single-transaction -c "SET session_replication_role = replica" -f "${publicBackupFile}" -c "SET session_replication_role = DEFAULT"`
);

console.log("\nStep 4b: Verify auth and profiles are in sync on main…");
try {
  const verifyOut = execSync(
    `"${psql}" -h ${mainConn.host} -p ${mainConn.port} -U ${mainConn.user} -d ${mainConn.database} -t -A -c "SELECT u.email, p.role FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id ORDER BY u.email"`,
    { encoding: "utf8", env: envWithMainPass, shell: true }
  );
  const lines = verifyOut.trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    console.log("  (no users in auth.users)");
  } else {
    console.log("  Users and roles on main:");
    for (const line of lines) {
      const [email, role] = line.split("|");
      console.log("   ", email || "(no email)", "→", role || "(no profile row)");
    }
    const missingProfile = lines.some((l) => !l.split("|")[1] || l.split("|")[1].trim() === "");
    if (missingProfile) {
      console.warn("\n  Warning: Some auth users have no profile row. Roles will show as teacher until they sign out and sign in again.");
    }
  }
} catch (e) {
  console.warn("  Verification query failed (non-fatal):", e.message);
}

console.log("\nImportant: After clone, users must sign out and sign in on the main app so their session matches the cloned auth.users and profiles. Otherwise the app may show role 'teacher'.");

(async () => {
  if (doStorage) {
    console.log("\nStep 5: Copy storage (all buckets) from dev to main…");
    await copyStorage(devSupabaseUrl, devServiceKey, mainSupabaseUrl, mainServiceKey);
  }
  console.log("\nDone. Main database (and storage, if enabled) is now a clone of development.");
  console.log("Backup kept at:", backupsDir);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
