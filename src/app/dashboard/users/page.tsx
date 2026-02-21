import { redirect } from "next/navigation";
import { getUser, isPrincipal } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import CreateUserForm from "@/components/CreateUserForm";
import { UserResetPasswordDialog } from "@/components/UserResetPasswordDialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isPrincipal(user)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: profiles } = admin
    ? await admin.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          User management
        </h1>
        <p className="text-muted-foreground mt-1">
          Create users and assign roles (Principal only).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <CreateUserForm />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {profiles && profiles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || p.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLES[(p.role as UserRole) ?? "teacher"]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserResetPasswordDialog userId={p.id} userEmail={p.email ?? "—"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No users yet. Create one above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
