/**
 * Sync all application users from production Supabase to development.
 * - Reads auth users and profiles from PROD (main DB)
 * - Creates each user in DEV with a temporary password and syncs profile (role, full_name)
 *
 * Uses .env.main for PROD and .env.development for DEV (same as branch-based setup).
 *
 * Run: npm run sync-users:prod-to-dev
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  readFileSync(path, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
  return out;
}

const root = process.cwd();
const mainEnv = loadEnv(join(root, ".env.main"));
const devEnv = loadEnv(join(root, ".env.development"));

const prodUrl = mainEnv.NEXT_PUBLIC_SUPABASE_URL;
const prodKey = mainEnv.SUPABASE_SERVICE_ROLE_KEY;
const devUrl = devEnv.NEXT_PUBLIC_SUPABASE_URL;
const devKey = devEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!prodUrl || !prodKey || !devUrl || !devKey) {
  console.error("Missing credentials. Ensure .env.main and .env.development exist with:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const prod = createClient(prodUrl, prodKey, { auth: { persistSession: false } });
const dev = createClient(devUrl, devKey, { auth: { persistSession: false } });

function randomPassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let s = "";
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function listAllUsers(supabase: ReturnType<typeof createClient>) {
  const users: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...(data.users ?? []));
    if (!data.users?.length || data.users.length < perPage) break;
    page++;
  }
  return users;
}

async function main() {
  console.log("Fetching users and profiles from PROD...");
  const [prodUsers, { data: prodProfiles, error: profileError }] = await Promise.all([
    listAllUsers(prod),
    prod.from("profiles").select("id, email, full_name, role"),
  ]);

  if (profileError) throw new Error(`prod profiles: ${profileError.message}`);
  const profileByEmail = new Map(
    (prodProfiles ?? []).map((p) => [p.email?.toLowerCase?.() ?? "", p])
  );
  const profileById = new Map((prodProfiles ?? []).map((p) => [p.id, p]));

  console.log(`Found ${prodUsers.length} auth users and ${prodProfiles?.length ?? 0} profiles in PROD.`);

  const devExisting = await listAllUsers(dev);
  const devEmails = new Set(devExisting.map((u) => u.email?.toLowerCase()).filter(Boolean));

  const results: { email: string; password: string; status: string }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of prodUsers) {
    const email = user.email?.trim()?.toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }
    const profile = profileByEmail.get(email) ?? profileById.get(user.id);
    const role = (profile?.role as string) ?? "teacher";
    const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? "";

    if (devEmails.has(email)) {
      const devUser = devExisting.find((u) => u.email?.toLowerCase() === email);
      if (devUser?.id) {
        const { error } = await dev.from("profiles").update({ role, full_name: fullName || null }).eq("id", devUser.id);
        if (error) console.warn(`Update profile ${email}: ${error.message}`);
        else updated++;
      }
      skipped++;
      continue;
    }

    const tempPassword = randomPassword(14);
    const { data: newUser, error } = await dev.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      console.warn(`Create ${email}: ${error.message}`);
      results.push({ email, password: "", status: `Error: ${error.message}` });
      continue;
    }

    if (newUser?.user?.id) {
      const { error: upErr } = await dev
        .from("profiles")
        .update({ role, full_name: fullName || null })
        .eq("id", newUser.user.id);
      if (upErr) console.warn(`Profile role ${email}: ${upErr.message}`);
      created++;
      results.push({ email, password: tempPassword, status: "Created" });
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}.`);

  const createdWithPassword = results.filter((r) => r.password && r.status === "Created");
  if (createdWithPassword.length > 0) {
    console.log("\nNew users (temporary password — copy now, not saved to disk):");
    createdWithPassword.forEach((r) => console.log(`  ${r.email} -> ${r.password}`));
  }

  const csvPath = join(process.cwd(), "sync-users-passwords.csv");
  if (existsSync(csvPath)) {
    unlinkSync(csvPath);
    console.log("\nRemoved sync-users-passwords.csv after successful run.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
