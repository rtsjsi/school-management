import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function AttendanceDailyRegister() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: manual } = await supabase
    .from("attendance_manual")
    .select("employee_id, attendance_date, status, in_time, out_time, employees(full_name)")
    .eq("attendance_date", today);

  const { data: punches } = await supabase
    .from("attendance_punches")
    .select("employee_id, punch_date, punch_type, punch_time, is_late, is_early_departure, employees(full_name)")
    .eq("punch_date", today)
    .order("punch_time");

  const manualMap = new Map<string, { status: string; in_time?: string; out_time?: string; name?: string }>();
  (manual ?? []).forEach((m) => {
    const eid = m.employee_id;
    const name = Array.isArray(m.employees) ? (m.employees[0] as { full_name?: string })?.full_name : (m.employees as { full_name?: string } | null)?.full_name;
    manualMap.set(eid, {
      status: m.status,
      in_time: m.in_time ?? undefined,
      out_time: m.out_time ?? undefined,
      name: name ?? undefined,
    });
  });

  const punchMap = new Map<string, { in?: string; out?: string; is_late?: boolean; is_early?: boolean; name?: string }>();
  (punches ?? []).forEach((p) => {
    const eid = p.employee_id;
    const existing = punchMap.get(eid) ?? {};
    const name = Array.isArray(p.employees) ? (p.employees[0] as { full_name?: string })?.full_name : (p.employees as { full_name?: string } | null)?.full_name;
    if (p.punch_type === "IN") {
      existing.in = p.punch_time ? new Date(p.punch_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined;
      existing.is_late = p.is_late ?? false;
    } else {
      existing.out = p.punch_time ? new Date(p.punch_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined;
      existing.is_early = p.is_early_departure ?? false;
    }
    existing.name = name ?? existing.name;
    punchMap.set(eid, existing);
  });

  const combined = new Map<string, { name: string; source: string; status?: string; in?: string; out?: string; is_late?: boolean; is_early?: boolean }>();
  manualMap.forEach((v, k) => {
    combined.set(k, {
      name: v.name ?? "—",
      source: "manual",
      status: v.status,
      in: v.in_time,
      out: v.out_time,
    });
  });
  punchMap.forEach((v, k) => {
    if (!combined.has(k)) {
      combined.set(k, {
        name: v.name ?? "—",
        source: "punch",
        in: v.in,
        out: v.out,
        is_late: v.is_late,
        is_early: v.is_early,
      });
    }
  });

  const rows = Array.from(combined.entries()).map(([eid, v]) => ({ employee_id: eid, ...v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Register - {today}</CardTitle>
        <CardDescription>Today&apos;s attendance (biometric + manual overrides).</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.employee_id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="capitalize">{r.source}</TableCell>
                  <TableCell>{r.status ?? "—"}</TableCell>
                  <TableCell>{r.in ?? "—"}</TableCell>
                  <TableCell>{r.out ?? "—"}</TableCell>
                  <TableCell>
                    {r.is_late && <span className="text-destructive text-xs">Late </span>}
                    {r.is_early && <span className="text-destructive text-xs">Early</span>}
                    {!r.is_late && !r.is_early && "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No attendance for today yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
