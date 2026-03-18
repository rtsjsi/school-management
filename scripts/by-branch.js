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
    if (!fs.existsSync(destPath)) {
      console.warn(
        "No",
        envFile,
        "or .env.local found. Copy .env.example to .env.main and .env.development (see docs/supabase-branches.md)."
      );
    }
    return;
  }
  fs.copyFileSync(srcPath, destPath);
}

function getProjectRefFromEnv(branch) {
  // Prefer branch env file, fallback to .env.local if user maintains only that.
  const branchEnvPath = path.join(repoRoot, getEnvFileName(branch));
  const localEnvPath = path.join(repoRoot, ".env.local");
  const branchEnv = parseEnvFile(branchEnvPath);
  const localEnv = parseEnvFile(localEnvPath);
  return branchEnv.SUPABASE_PROJECT_REF || localEnv.SUPABASE_PROJECT_REF || null;
}

const branch = getCurrentBranch();
if (!branch) {
  console.warn("Could not determine Git branch; syncing env skipped.");
  process.exit(0);
}

// 1. Always sync env so dev/build and Supabase CLI use the right project
syncEnv(branch);

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

// 2. Supabase CLI: link to branch project, then run given command
const ref = getProjectRefFromEnv(branch);
if (!ref) {
  console.error("Missing SUPABASE_PROJECT_REF in", getEnvFileName(branch), "or .env.local (see docs/supabase-branches.md).");
  process.exit(1);
}

execSync(`npx supabase link --project-ref ${ref}`, {
  stdio: "inherit",
  cwd: repoRoot,
});

if (args[0] === "link") {
  process.exit(0);
}

// Make db pushes non-interactive (avoid "[Y/n]" prompt in CI).
// Only add when user didn't already pass --yes.
const effectiveArgs = [...args];
if (effectiveArgs[0] === "db" && effectiveArgs[1] === "push" && !effectiveArgs.includes("--yes")) {
  effectiveArgs.push("--yes");
}

execSync(`npx supabase ${effectiveArgs.join(" ")}`, {
  stdio: "inherit",
  cwd: repoRoot,
  shell: true,
});
