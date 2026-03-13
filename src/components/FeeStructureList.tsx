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
import { FeeStructureRowActions } from "@/components/FeeStructureRowActions";

export async function FeeStructureList({ canEdit = false }: { canEdit?: boolean }) {
  const supabase = await createClient();
  const { data: structures } = await supabase
    .from("fee_structures")
    .select(`
      id,
      standard_id,
      standards(name),
      academic_year,
      fee_structure_items(fee_type, quarter, amount)
    `)
    .order("academic_year", { ascending: false })
    .order("standard_id");

  if (!structures || structures.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Add a fee structure above.</p>
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
              <TableHead>Standard</TableHead>
              <TableHead>Academic Year</TableHead>
              <TableHead>Items</TableHead>
              {canEdit && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.map((s) => {
              const items = s.fee_structure_items ?? [];
              const itemCount = items.length;
              const standardName =
                (Array.isArray(s.standards)
                  ? (s.standards[0] as { name?: string })?.name
                  : (s.standards as { name?: string } | null)?.name) ?? "—";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{standardName}</TableCell>
                  <TableCell>{s.academic_year}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {itemCount} items
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <FeeStructureRowActions
                        structure={{
                          id: s.id,
                          standardName,
                          academic_year: s.academic_year,
                        }}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
