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

export async function HolidayList() {
  const supabase = await createClient();
  const { data: holidays } = await supabase
    .from("holidays")
    .select("id, date, name, type")
    .order("date", { ascending: false })
    .limit(50);

  if (!holidays || holidays.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No holidays added.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.date ? new Date(h.date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell className="capitalize">{h.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
