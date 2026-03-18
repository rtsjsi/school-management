#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function out(cmd) {
  return execSync(cmd, { encoding: "utf8", shell: true }).trim();
}

function main() {
  const status = out("git status --porcelain");
  if (status) {
    console.error("Working tree is not clean. Commit your changes before pushing.");
    process.exit(1);
  }

  const branch = out("git rev-parse --abbrev-ref HEAD");
  let upstream = "";
  try {
    upstream = out("git rev-parse --abbrev-ref --symbolic-full-name @{u}");
  } catch {
    upstream = "";
  }

  if (!upstream) {
    run("git push -u origin HEAD");
  } else {
    run("git push");
  }

  run("npm run db:push");

  console.log(`Done: pushed ${branch} and synced DB.`);
}

main();

