"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import CreateUserForm from "@/components/CreateUserForm";
import { UserResetPasswordDialog } from "@/components/UserResetPasswordDialog";
import { SchoolSettingsForm } from "@/components/SchoolSettingsForm";
import { AcademicYearsManager } from "@/components/AcademicYearsManager";

type SchoolSettingsForForm = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  principal_signature_path: string | null;
  logoUrl: string | null;
  principalSignatureUrl: string | null;
} | null;

type ProfileRow = { id: string; email: string | null; full_name: string | null; role: string | null; created_at: string };

export function AdministrationTabs({
  defaultTab,
  profiles,
  initialSettings,
  isPrincipal,
}: {
  defaultTab: string;
  profiles: ProfileRow[];
  initialSettings: SchoolSettingsForForm;
  isPrincipal: boolean;
}) {
  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="flex flex-wrap gap-1 w-full overflow-x-auto">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="settings">School settings</TabsTrigger>
        <TabsTrigger value="academic-year">Academic year</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <CreateUserForm />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {profiles.length > 0 ? (
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
                <p className="text-sm text-muted-foreground py-8 text-center">No users yet. Create one above.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="settings" className="space-y-6">
        <SchoolSettingsForm initialSettings={initialSettings} isPrincipal={isPrincipal} />
      </TabsContent>
      <TabsContent value="academic-year" className="space-y-6">
        <AcademicYearsManager />
      </TabsContent>
    </Tabs>
  );
}
