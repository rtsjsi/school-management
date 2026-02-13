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

export async function ShiftList() {
  const supabase = await createClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, grace_period_minutes, late_threshold_minutes, early_departure_threshold_minutes")
    .order("name");

  if (!shifts || shifts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shifts</CardTitle>
          <CardDescription>No shifts defined.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const fmt = (t: string) => {
    if (!t) return "—";
    const [h, m] = String(t).split(":");
    return `${h}:${m}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shifts</CardTitle>
        <CardDescription>Defined shifts with timings and thresholds.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Grace (min)</TableHead>
              <TableHead>Late (min)</TableHead>
              <TableHead>Early Dep (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{fmt(s.start_time)}</TableCell>
                <TableCell>{fmt(s.end_time)}</TableCell>
                <TableCell>{s.grace_period_minutes ?? 0}</TableCell>
                <TableCell>{s.late_threshold_minutes ?? 15}</TableCell>
                <TableCell>{s.early_departure_threshold_minutes ?? 15}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
