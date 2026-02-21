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
  console.error("Could not determine Git branch (not a repo or detached HEAD).");
  process.exit(1);
}

const ref = getProjectRef(branch);
if (!ref) {
  console.error("No project ref for branch:", branch);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Linking to project", ref, "for branch", branch);
  execSync(`npx supabase link --project-ref ${ref}`, {
    stdio: "inherit",
    cwd: repoRoot,
  });
  process.exit(0);
}

execSync(`npx supabase link --project-ref ${ref}`, {
  stdio: "inherit",
  cwd: repoRoot,
});
execSync(`npx supabase ${args.join(" ")}`, {
  stdio: "inherit",
  cwd: repoRoot,
  shell: true,
});
