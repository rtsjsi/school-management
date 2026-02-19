import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isGradeInRange } from "@/lib/grade-utils";
import { getFeeTypeLabel } from "@/lib/utils";

export async function OutstandingFeesList() {
  const supabase = await createClient();
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, grade, section, is_rte_quota")
    .eq("status", "active");

  const { data: structures } = await supabase
    .from("fee_structures")
    .select(`
      id,
      grade_from,
      grade_to,
      fee_structure_items(fee_type, quarter, amount)
    `)
    .eq("academic_year", ay);

  const { data: collections } = await supabase
    .from("fee_collections")
    .select("student_id, quarter, fee_type, amount")
    .eq("academic_year", ay);

  const paidMap = new Map<string, number>();
  (collections ?? []).forEach((c) => {
    const key = `${c.student_id}-${c.quarter}-${c.fee_type}`;
    paidMap.set(key, (paidMap.get(key) ?? 0) + Number(c.amount));
  });

  const defaulters: { student_id: string; full_name: string; grade: string; section: string; quarter: number; fee_type: string; total: number; paid: number; outstanding: number }[] = [];

  for (const s of students ?? []) {
    if ((s as { is_rte_quota?: boolean }).is_rte_quota) continue;
    const grade = s.grade ?? "";
    const structure = (structures ?? []).find(
      (st) => isGradeInRange(grade, st.grade_from, st.grade_to)
    );
    if (!structure) continue;

    const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
    for (const item of items) {
      const total = Number(item.amount);
      const key = `${s.id}-${item.quarter}-${item.fee_type}`;
      const paid = paidMap.get(key) ?? 0;
      const outstanding = total - paid;
      if (outstanding > 0) {
        defaulters.push({
          student_id: s.id,
          full_name: s.full_name,
          grade: s.grade ?? "—",
          section: s.section ?? "",
          quarter: item.quarter,
          fee_type: item.fee_type,
          total,
          paid,
          outstanding,
        });
      }
    }
  }

  defaulters.sort((a, b) => a.full_name.localeCompare(b.full_name) || a.quarter - b.quarter);

  if (!defaulters.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">All fees are up to date.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col min-w-0" style={{ maxHeight: 400 }}>
          <div className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaulters.map((d, i) => (
                  <TableRow key={`${d.student_id}-${d.quarter}-${d.fee_type}-${i}`}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {d.full_name}
                    </TableCell>
                    <TableCell>{d.grade}</TableCell>
                    <TableCell>{d.section}</TableCell>
                    <TableCell>Q{d.quarter}</TableCell>
                    <TableCell>{getFeeTypeLabel(d.fee_type)}</TableCell>
                    <TableCell>{d.total.toLocaleString()}</TableCell>
                    <TableCell>{d.paid.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{d.outstanding.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
