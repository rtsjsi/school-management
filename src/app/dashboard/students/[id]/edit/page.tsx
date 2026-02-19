import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { StudentEditForm } from "@/components/StudentEditForm";

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard/students");

  const { id } = await params;
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !student) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Edit Student
        </h1>
        <p className="text-muted-foreground mt-1">
          Update details for {student.full_name}
          {student.student_id && (
            <span className="font-mono text-xs ml-2">({student.student_id})</span>
          )}
        </p>
      </div>

      <StudentEditForm student={student as Record<string, unknown> & { id: string; full_name: string }} />
    </div>
  );
}
