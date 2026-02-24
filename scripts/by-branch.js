#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "supabase", "branch-projects.json");

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

function getProjectRef(branch) {
  if (!fs.existsSync(configPath)) {
    console.error("Missing supabase/branch-projects.json");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return config[branch] ?? config.development ?? config.main ?? null;
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
const ref = getProjectRef(branch);
if (!ref) {
  console.error("No project ref for branch:", branch);
  process.exit(1);
}

execSync(`npx supabase link --project-ref ${ref}`, {
  stdio: "inherit",
  cwd: repoRoot,
});

if (args[0] === "link") {
  process.exit(0);
}

execSync(`npx supabase ${args.join(" ")}`, {
  stdio: "inherit",
  cwd: repoRoot,
  shell: true,
});
