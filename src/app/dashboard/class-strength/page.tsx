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
    .select("id, grade, division, status")
    .eq("status", "active");

  const rows: { grade: string; division: string; count: number }[] = [];
  const byKey: Record<string, number> = {};
  for (const s of students ?? []) {
    const grade = (s as { grade?: string }).grade ?? "—";
    const division = (s as { division?: string }).division ?? "—";
    const key = `${grade}\t${division}`;
    byKey[key] = (byKey[key] ?? 0) + 1;
  }
  const keys = Object.keys(byKey).sort();
  for (const key of keys) {
    const [grade, division] = key.split("\t");
    rows.push({ grade, division, count: byKey[key]! });
  }

  const total = (students ?? []).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Standard-wise strength report
        </h1>
        <p className="text-muted-foreground mt-1">
          Student count by standard and division (active only).
        </p>
      </div>

      <ClassStrengthReport rows={rows} total={total} />
    </div>
  );
}
