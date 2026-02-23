#!/usr/bin/env node
"use strict";

/**
 * Create a backup file of the development database (public schema) in the project folder.
 * Import this file into main manually (e.g. Supabase Dashboard → SQL Editor, or psql).
 *
 * Prerequisites:
 * - PostgreSQL client (pg_dump) — script auto-finds it in C:\Program Files\PostgreSQL on Windows
 * - DEV_DATABASE_URL in .env.development (or export)
 *
 * Free tier / IPv4: Use the SESSION POOLER URI (not direct DB). Supabase free tier direct
 * connection is IPv6-only. In Dashboard → Development project → Connect → choose
 * "Session" pooler and copy the URI (host like aws-0-<region>.pooler.supabase.com:5432).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const backupsDir = path.join(repoRoot, "supabase", "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupFile = path.join(backupsDir, `dev-backup-${timestamp}.sql`);

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

const env = loadEnv(".env.development");
const envProcess = process.env;
const DEV_DATABASE_URL = envProcess.DEV_DATABASE_URL ?? env.DEV_DATABASE_URL ?? "";

if (!DEV_DATABASE_URL) {
  console.error(
    "Missing DEV_DATABASE_URL. Set it in .env.development or export it.\n" +
      "Use the Session pooler URI from Dashboard → Connect → Session (required for free tier / IPv4)."
  );
  process.exit(1);
}

const conn = parseDbUrl(DEV_DATABASE_URL);
if (!conn) {
  console.error("Invalid DEV_DATABASE_URL (must be a valid postgresql:// URI).");
  process.exit(1);
}

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const pgBinPath = getPgBinPath();
const pathSep = process.platform === "win32" ? ";" : ":";
const runEnv = {
  ...process.env,
  PGPASSWORD: conn.password,
  ...(pgBinPath ? { PATH: pgBinPath + pathSep + process.env.PATH } : {}),
};
const pgDump =
  process.platform === "win32" && pgBinPath
    ? path.join(pgBinPath, "pg_dump.exe")
    : "pg_dump";

// Build URI without password (PGPASSWORD in env). Use -d so libpq gets exact connection.
// Quoting for shell: wrap in double quotes and escape any " in values.
function shellQuote(s) {
  const str = String(s);
  return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
const uriNoPass = `postgresql://${conn.user}@${conn.host}:${conn.port}/${conn.database}`;

console.log("Dumping development database (public schema) to backup file…");
console.log("Connecting to host:", conn.host);
try {
  execSync(
    [
      shellQuote(pgDump),
      "-d", shellQuote(uriNoPass),
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "-f", shellQuote(backupFile),
    ].join(" "),
    { stdio: "inherit", shell: true, env: runEnv }
  );
} catch (e) {
  console.error("pg_dump failed.");
  if (e.message && e.message.includes("could not translate host name")) {
    console.error(
      "Tip: On free tier, direct DB is IPv6-only. Use the Session pooler URI: Dashboard → Connect → Session (host like aws-0-<region>.pooler.supabase.com:5432)."
    );
  } else {
    console.error("On Windows the script looks for pg_dump in C:\\Program Files\\PostgreSQL\\17\\bin.");
  }
  process.exit(1);
}

console.log("Done. Backup saved to:");
console.log("  " + backupFile);
console.log("\nTo import into main: use Supabase Dashboard (main project) → SQL Editor → paste/run the file, or use psql with main's connection string.");
