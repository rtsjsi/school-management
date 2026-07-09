import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearId } from "@/lib/enrollment";
import { ExamsClientList } from "@/components/ExamsClientList";
import { Card, CardContent } from "@/components/ui/card";

export async function ExamsList() {
  const user = await getUser();
  if (!user) return null;

  const activeYearId = await getActiveAcademicYearId();
  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select("id, name, standard, term")
    .order("created_at", { ascending: false });
  if (activeYearId) query = query.eq("academic_year_id", activeYearId);
  const { data: exams } = await query;

  const canEdit = isAdminOrAbove(user);

  return (
    <Card>
      <CardContent className="pt-6">
        <ExamsClientList exams={exams ?? []} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
