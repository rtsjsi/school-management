#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const repoRoot = process.cwd();

function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      cwd: repoRoot,
    }).trim();
  } catch {
    return null;
  }
}

function getEnvFileName(branch) {
  if (branch === "main") return ".env.main";
  return ".env.development";
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const content = fs.readFileSync(filePath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    const key = m[1].trim();
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    out[key] = value;
  });
  return out;
}

function syncEnv(branch) {
  const envFile = getEnvFileName(branch);
  const srcPath = path.join(repoRoot, envFile);
  const destPath = path.join(repoRoot, ".env.local");

  if (!fs.existsSync(srcPath)) {
    console.warn(`No ${envFile} found.`);
    return;
  }
  fs.copyFileSync(srcPath, destPath);
}

const branch = getCurrentBranch();
if (!branch) {
  console.warn("Could not determine Git branch; syncing env skipped.");
  process.exit(0);
}

// 1. Sync env so Next.js uses the right environment for this branch
syncEnv(branch);

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

// If user ran `npm run supabase:link`, tell them it's deprecated.
if (args[0] === "link") {
  console.log("Stateful 'supabase link' is deprecated in this project. We use a strictly stateless architecture.");
  process.exit(0);
}

// 2. Stateless proxy for Supabase CLI commands (like db push)
const envFile = getEnvFileName(branch);
const envPath = path.join(repoRoot, envFile);
const parsedEnv = parseEnvFile(envPath);

const projectId = parsedEnv.SUPABASE_PROJECT_ID;
const dbPassword = parsedEnv.SUPABASE_DB_PASSWORD;

if (!projectId || !dbPassword) {
  console.error(`Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD in ${envFile}`);
  process.exit(1);
}

// Inject credentials statelessly into the child process
const childEnv = {
  ...process.env,
  SUPABASE_PROJECT_ID: projectId,
  SUPABASE_DB_PASSWORD: dbPassword,
};

const effectiveArgs = [...args];
if (effectiveArgs[0] === "db" && effectiveArgs[1] === "push" && !effectiveArgs.includes("--yes")) {
  effectiveArgs.push("--yes");
}

try {
  execSync(`npx supabase ${effectiveArgs.join(" ")}`, {
    stdio: "inherit",
    cwd: repoRoot,
    shell: true,
    env: childEnv,
  });
} catch (error) {
  process.exit(error.status || 1);
}
