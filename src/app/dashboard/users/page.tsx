import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-7 w-7" />
        User management
      </h1>
      <p className="text-muted-foreground mt-1">
        Manage users and assign roles (Admin & Super Admin only).
      </p>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-8 text-center text-muted-foreground">
        User list and role assignment will be added here.
      </div>
    </div>
  );
}
