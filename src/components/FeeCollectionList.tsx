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

export async function FeeCollectionList() {
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("fee_collections")
    .select("id, amount, fee_type, quarter, academic_year, payment_mode, receipt_number, collected_at, students(full_name)")
    .order("collected_at", { ascending: false })
    .limit(20);

  if (!collections || collections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Record a payment above.</p>
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
              <TableHead>Receipt</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qtr</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.receipt_number}</TableCell>
                <TableCell className="font-medium">
                  {Array.isArray(c.students) ? (c.students[0] as { full_name?: string })?.full_name ?? "—" : (c.students as { full_name?: string } | null)?.full_name ?? "—"}
                </TableCell>
                <TableCell>{Number(c.amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{c.fee_type}</TableCell>
                <TableCell>Q{c.quarter}</TableCell>
                <TableCell className="capitalize">{c.payment_mode}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.collected_at ? new Date(c.collected_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
