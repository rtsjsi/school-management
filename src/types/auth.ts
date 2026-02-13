export type UserRole = "super_admin" | "admin" | "teacher";

export const ROLES: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
};

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}
