import { getUser, isSuperAdmin, isAdminOrAbove } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { Shield, Users, BookOpen, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user.fullName ?? user.email ?? "User"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Signed in as <span className="font-medium text-foreground">{roleLabel}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Your role"
          value={roleLabel}
          icon={Shield}
          description="Role-based access is active"
        />
        {isAdminOrAbove(user) && (
          <Card
            title="User management"
            value="Admin"
            icon={Users}
            description="Manage users and roles"
          />
        )}
        <Card
          title="Classes"
          value="—"
          icon={BookOpen}
          description="View and manage classes"
        />
        <Card
          title="Reports"
          value="—"
          icon={BarChart3}
          description="Analytics and reports"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Role permissions</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong className="text-foreground">Teacher:</strong> View dashboard, manage own classes, view students.</li>
          <li>• <strong className="text-foreground">Admin:</strong> Everything teachers can do, plus user management and school settings.</li>
          <li>• <strong className="text-foreground">Super Admin:</strong> Full access: all admin features plus role assignment and system settings.</li>
        </ul>
        {isSuperAdmin(user) && (
          <p className="mt-4 text-sm text-blue-600 font-medium">
            You have full access. Use the Users page to assign roles.
          </p>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{description}</p>
    </div>
  );
}
