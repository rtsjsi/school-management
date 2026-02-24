#!/usr/bin/env node
"use strict";

/**
 * Run flush-db.sql on the Supabase database for the current Git branch.
 * Uses DEV_DATABASE_URL (development branch) or MAIN_DATABASE_URL (main branch).
 * Requires: psql on PATH (or PostgreSQL bin in default Windows install path).
 * Flushes public schema only (auth and storage are not touched).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const flushSqlPath = path.join(repoRoot, "scripts", "flush-db.sql");

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

function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: repoRoot }).trim();
  } catch {
    return null;
  }
}

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

const branch = getCurrentBranch();
if (!branch) {
  console.error("Could not determine Git branch.");
  process.exit(1);
}

const envMain = loadEnv(".env.main");
const envDev = loadEnv(".env.development");
const envProcess = process.env;

const databaseUrl =
  branch === "main"
    ? envProcess.MAIN_DATABASE_URL ?? envMain.MAIN_DATABASE_URL ?? ""
    : envProcess.DEV_DATABASE_URL ?? envDev.DEV_DATABASE_URL ?? "";

if (!databaseUrl) {
  console.error(
    branch === "main"
      ? "Missing MAIN_DATABASE_URL. Set it in .env.main or export it."
      : "Missing DEV_DATABASE_URL. Set it in .env.development or export it."
  );
  console.error("Use the Session pooler URI from Supabase Dashboard → Connect → Database.");
  process.exit(1);
}

const conn = parseDbUrl(databaseUrl);
if (!conn) {
  console.error("Invalid database URL (must be a valid postgresql:// URI).");
  process.exit(1);
}

if (!fs.existsSync(flushSqlPath)) {
  console.error("Missing scripts/flush-db.sql");
  process.exit(1);
}

function getPgBinPath() {
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    for (const ver of ["17", "16", "15", "14"]) {
      const bin = path.join(programFiles, "PostgreSQL", ver, "bin");
      if (fs.existsSync(path.join(bin, "psql.exe"))) return bin;
    }
  }
  return "";
}

const pgBinPath = getPgBinPath();
const pathSep = process.platform === "win32" ? ";" : ":";
const psql = process.platform === "win32" && pgBinPath ? path.join(pgBinPath, "psql.exe") : "psql";
const env = {
  ...process.env,
  PGPASSWORD: conn.password,
  ...(pgBinPath ? { PATH: pgBinPath + pathSep + process.env.PATH } : {}),
};

console.log(`Branch: ${branch}. Flushing public schema on ${conn.host}...`);
execSync(`"${psql}" -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -v ON_ERROR_STOP=1 -f "${flushSqlPath}"`, {
  stdio: "inherit",
  shell: true,
  env,
});
console.log("Done.");
