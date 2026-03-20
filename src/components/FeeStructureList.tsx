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

type StandardsEmbed = { name?: string; sort_order?: number } | { name?: string; sort_order?: number }[] | null;

function standardSortOrderFromRow(standards: StandardsEmbed): number {
  const s = standards == null ? null : Array.isArray(standards) ? standards[0] : standards;
  const n = s && typeof s === "object" && "sort_order" in s ? Number((s as { sort_order: number }).sort_order) : NaN;
  return Number.isFinite(n) ? n : 9999;
}

function standardNameFromRow(standards: StandardsEmbed): string {
  const s = standards == null ? null : Array.isArray(standards) ? standards[0] : standards;
  return (s as { name?: string } | null)?.name ?? "";
}

export async function FeeStructureList({ canEdit = false }: { canEdit?: boolean }) {
  const supabase = await createClient();
  const { data: structuresRaw } = await supabase
    .from("fee_structures")
    .select(`
      id,
      standard_id,
      standards(name, sort_order),
      academic_year,
      total_fees,
      fee_structure_items(fee_type, quarter, amount)
    `);

  const structures =
    structuresRaw == null
      ? []
      : [...structuresRaw].sort((a, b) => {
          const yearCmp = String(b.academic_year ?? "").localeCompare(String(a.academic_year ?? ""));
          if (yearCmp !== 0) return yearCmp;
          const ordA = standardSortOrderFromRow(a.standards as StandardsEmbed);
          const ordB = standardSortOrderFromRow(b.standards as StandardsEmbed);
          if (ordA !== ordB) return ordA - ordB;
          return standardNameFromRow(a.standards as StandardsEmbed).localeCompare(
            standardNameFromRow(b.standards as StandardsEmbed),
          );
        });

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
              <TableHead className="text-right whitespace-nowrap">Total fees</TableHead>
              <TableHead>Items</TableHead>
              {canEdit && <TableHead className="w-24"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.map((s) => {
              const items = s.fee_structure_items ?? [];
              const itemCount = items.length;
              const totalRaw = (s as { total_fees?: number | string | null }).total_fees;
              const totalNum =
                totalRaw == null ? NaN : typeof totalRaw === "number" ? totalRaw : Number.parseFloat(String(totalRaw));
              const totalDisplay = Number.isFinite(totalNum)
                ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalNum)
                : "—";
              const standardName =
                (Array.isArray(s.standards)
                  ? (s.standards[0] as { name?: string })?.name
                  : (s.standards as { name?: string } | null)?.name) ?? "—";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{standardName}</TableCell>
                  <TableCell>{s.academic_year}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-sm">₹{totalDisplay}</TableCell>
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
