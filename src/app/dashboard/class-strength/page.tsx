import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BarChart3 } from "lucide-react";
import { ClassStrengthReport } from "@/components/ClassStrengthReport";

export default async function ClassStrengthPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, grade, section, status")
    .eq("status", "active");

  const rows: { grade: string; section: string; count: number }[] = [];
  const byKey: Record<string, number> = {};
  for (const s of students ?? []) {
    const grade = (s as { grade?: string }).grade ?? "—";
    const section = (s as { section?: string }).section ?? "—";
    const key = `${grade}\t${section}`;
    byKey[key] = (byKey[key] ?? 0) + 1;
  }
  const keys = Object.keys(byKey).sort();
  for (const key of keys) {
    const [grade, section] = key.split("\t");
    rows.push({ grade, section, count: byKey[key]! });
  }

  const total = (students ?? []).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Class-wise Strength Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Student count by grade and section (active only).
        </p>
      </div>

      <ClassStrengthReport rows={rows} total={total} />
    </div>
  );
}
