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
  if (branch === "development") return ".env.development";
  return ".env.development";
}

const branch = getCurrentBranch();
if (!branch) {
  console.warn("Could not determine Git branch; leaving .env.local unchanged.");
  process.exit(0);
}

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
  process.exit(0);
}

fs.copyFileSync(srcPath, destPath);
process.exit(0);
