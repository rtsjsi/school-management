"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { FeeStructureRowActions } from "@/components/FeeStructureRowActions";
import { getFeeTypeLabel } from "@/lib/utils";

type StructureRow = {
  id: string;
  standard_id: string;
  academic_year: string;
  standards: { name?: string } | { name?: string }[] | null;
  fee_structure_items: { fee_type: string; quarter: number; amount: number }[] | null;
};

type StandardLov = { id: string; name: string; sort_order: number };

export function FeeStructureListWithFilters({ canEdit = false }: { canEdit?: boolean }) {
  const supabase = createClient();
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [standards, setStandards] = useState<StandardLov[]>([]);
  const [standardFilter, setStandardFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");

  const loadStandards = () => {
    supabase
      .from("standards")
      .select("id, name, sort_order")
      .order("sort_order")
      .then(({ data }) => setStandards((data ?? []) as StandardLov[]));
  };

  const loadStructures = () => {
    let query = supabase
      .from("fee_structures")
      .select(
        `
        id,
        standard_id,
        standards(name),
        academic_year,
        fee_structure_items(fee_type, quarter, amount)
      `,
      )
      .order("academic_year", { ascending: false })
      .order("standard_id");

    if (standardFilter) {
      query = query.eq("standard_id", standardFilter);
    }
    if (yearFilter) {
      query = query.eq("academic_year", yearFilter);
    }

    query.then(({ data }) => {
      setStructures((data ?? []) as StructureRow[]);
    });
  };

  useEffect(() => {
    loadStandards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardFilter, yearFilter]);

  const clearFilters = () => {
    setStandardFilter("");
    setYearFilter("");
  };

  const renderAmounts = (items: { fee_type: string; quarter: number; amount: number }[] | null) => {
    const list = items ?? [];
    if (list.length === 0) {
      return <span className="text-xs text-muted-foreground">No items</span>;
    }
    const byType: Record<string, Record<number, number>> = {};
    for (const it of list) {
      const rawAmount = (it as unknown as { amount: number | string }).amount;
      const amountNumber =
        typeof rawAmount === "number" ? rawAmount : Number.parseFloat(String(rawAmount));
      if (!Number.isFinite(amountNumber)) continue;
      if (!byType[it.fee_type]) byType[it.fee_type] = {};
      byType[it.fee_type][it.quarter] = amountNumber;
    }
    const feeTypes = Object.keys(byType).sort();
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 pr-2">Fee Type</th>
              <th className="text-left py-1 px-1">Q1</th>
              <th className="text-left py-1 px-1">Q2</th>
              <th className="text-left py-1 px-1">Q3</th>
              <th className="text-left py-1 px-1">Q4</th>
            </tr>
          </thead>
          <tbody>
            {feeTypes.map((ft) => (
              <tr key={ft} className="border-b last:border-b-0">
                <td className="py-1 pr-2 align-middle">{getFeeTypeLabel(ft)}</td>
                {[1, 2, 3, 4].map((q) => (
                  <td key={q} className="py-1 px-1 align-middle">
                    {byType[ft][q] != null ? byType[ft][q].toFixed(2) : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getStandardName = (row: StructureRow) => {
    const s = row.standards;
    if (Array.isArray(s)) {
      return (s[0] as { name?: string })?.name ?? "—";
    }
    return (s as { name?: string } | null)?.name ?? "—";
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Standard</span>
            <Select value={standardFilter} onValueChange={setStandardFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {standards.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AcademicYearSelect
            id="fee-structure-filter-ay"
            label="Academic Year"
            value={yearFilter}
            onChange={setYearFilter}
          />
          {(standardFilter || yearFilter) && (
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {structures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fee structures found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Quarter-wise Amounts (per fee type)</TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s) => {
                const standardName = getStandardName(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{standardName}</TableCell>
                    <TableCell>{s.academic_year}</TableCell>
                    <TableCell>{renderAmounts(s.fee_structure_items)}</TableCell>
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
        )}
      </CardContent>
    </Card>
  );
}

