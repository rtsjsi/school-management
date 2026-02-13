import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { StudentsList } from "@/components/async/StudentsList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Student Master
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage student records, personal details, and academic information.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
          <StudentsList />
        </Suspense>
      </div>
    </div>
  );
}
