"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import CreateUserForm from "@/components/CreateUserForm";
import { UserResetPasswordDialog } from "@/components/UserResetPasswordDialog";
import { UserClassAccessDialog } from "@/components/UserClassAccessDialog";
import { SchoolSettingsForm } from "@/components/SchoolSettingsForm";
import { AcademicYearsManager } from "@/components/AcademicYearsManager";
import { toggleUserStatus } from "@/app/(workspace)/dashboard/users/actions";
import { Plus } from "lucide-react";

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

type ProfileRow = { id: string; email: string | null; full_name: string | null; role: string | null; created_at: string; is_active: boolean };

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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isPending, startTransition] = useTransition();

  const [localProfiles, setLocalProfiles] = useState(profiles);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setLocalProfiles((prev) => 
      prev.map((p) => (p.id === userId ? { ...p, is_active: newStatus } : p))
    );
    
    startTransition(async () => {
      await toggleUserStatus(userId, newStatus);
      router.refresh();
    });
  };

  const filteredProfiles = localProfiles.filter((p) => {
    const matchesSearch =
      (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? p.is_active : !p.is_active;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="flex flex-nowrap gap-1 w-full">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="settings">School settings</TabsTrigger>
        <TabsTrigger value="academic-year">Academic year</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="space-y-4 sm:space-y-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Roles</option>
                  {(Object.keys(ROLES) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r]}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active Users</option>
                  <option value="inactive">Inactive Users</option>
                  <option value="all">All Users</option>
                </select>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create new user
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <CreateUserForm />
                </DialogContent>
              </Dialog>
            </div>
            
            {filteredProfiles.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div>{p.full_name || p.email || "—"}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[160px] sm:hidden">{p.email ?? ""}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">{p.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">{ROLES[(p.role as UserRole) ?? "teacher"]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? "default" : "destructive"} className="text-[10px] sm:text-xs">
                            {p.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2 mr-2">
                               <span className="text-xs text-muted-foreground">Active:</span>
                               <Switch 
                                 checked={p.is_active} 
                                 onCheckedChange={() => handleToggleActive(p.id, p.is_active)}
                               />
                            </div>
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
              <p className="text-sm text-muted-foreground py-8 text-center">No users match your criteria.</p>
            )}
          </CardContent>
        </Card>
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
