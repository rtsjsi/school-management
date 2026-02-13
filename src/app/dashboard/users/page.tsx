import { redirect } from "next/navigation";
import { getUser, isSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import CreateUserForm from "@/components/CreateUserForm";

export default async function UsersPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: profiles } = admin
    ? await admin.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-7 w-7" />
        User management
      </h1>
      <p className="text-muted-foreground mt-1">
        Create users and assign roles (Super Admin only).
      </p>

      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create user</h2>
          <CreateUserForm />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Users</h2>
          {profiles && profiles.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {profiles.map((p) => (
                <li key={p.id} className="py-3 first:pt-0">
                  <div className="font-medium text-foreground">{p.full_name || p.email || "—"}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.email && <span>{p.email}</span>}
                    <span> · {ROLES[(p.role as UserRole) ?? "teacher"]}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No users yet. Create one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
