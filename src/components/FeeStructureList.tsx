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

export async function FeeStructureList() {
  const supabase = await createClient();
  const { data: structures } = await supabase
    .from("fee_structures")
    .select(`
      id,
      name,
      grade_from,
      grade_to,
      academic_year,
      fee_structure_items(fee_type, quarter, amount)
    `)
    .order("academic_year", { ascending: false })
    .order("name");

  if (!structures || structures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
          <CardDescription>No fee structures defined yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add a fee structure above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Structures</CardTitle>
        <CardDescription>Defined structures by standard and quarter.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade Range</TableHead>
              <TableHead>Academic Year</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.map((s) => {
              const items = (s.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
              const itemCount = items.length;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.grade_from} - {s.grade_to}</TableCell>
                  <TableCell>{s.academic_year}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {itemCount} items
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
