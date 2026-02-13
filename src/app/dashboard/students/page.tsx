import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap } from "lucide-react";
import StudentEntryForm from "@/components/StudentEntryForm";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, email, grade, section, date_of_birth, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const canEdit = isAdminOrAbove(user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <GraduationCap className="h-7 w-7" />
        Students
      </h1>
      <p className="text-muted-foreground mt-1">
        {canEdit
          ? "Add and manage students (Admin & Super Admin)."
          : "View student list (read-only)."}
      </p>

      <div className={`mt-8 grid gap-8 ${canEdit ? "lg:grid-cols-2" : ""}`}>
        {canEdit && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add student</h2>
            <StudentEntryForm />
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {canEdit ? "Recent students" : "Students"}
          </h2>
          {students && students.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {students.map((s) => (
                <li key={s.id} className="py-3 first:pt-0">
                  <div className="font-medium text-foreground">{s.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.email && <span>{s.email}</span>}
                    {(s.grade || s.section) && (
                      <span> · {[s.grade, s.section].filter(Boolean).join(" ")}</span>
                    )}
                    {s.date_of_birth && (
                      <span> · DOB: {new Date(s.date_of_birth).toLocaleDateString()}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              {canEdit ? "No students yet. Add one using the form." : "No students yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
