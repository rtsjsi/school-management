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
import { UserClassAccessDialog } from "@/components/UserClassAccessDialog";
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
      <TabsList className="flex flex-nowrap gap-1 w-full">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="settings">School settings</TabsTrigger>
        <TabsTrigger value="academic-year">Academic year</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="space-y-4 sm:space-y-6">
        <div className="grid gap-4 lg:grid-cols-2 sm:gap-6">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <CreateUserForm />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              {profiles.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <div>{p.full_name || p.email || "—"}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[160px] sm:hidden">{p.email ?? ""}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{p.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">{ROLES[(p.role as UserRole) ?? "teacher"]}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <UserClassAccessDialog
                                profileId={p.id}
                                displayName={p.full_name || p.email || "User"}
                              />
                              <UserResetPasswordDialog userId={p.id} userEmail={p.email ?? "—"} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
