"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { grade: string; section: string; count: number };

export function ClassStrengthReport({ rows, total }: { rows: Row[]; total: number }) {
  const byGrade: Record<string, Row[]> = {};
  for (const r of rows) {
    if (!byGrade[r.grade]) byGrade[r.grade] = [];
    byGrade[r.grade].push(r);
  }
  const grades = Object.keys(byGrade).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strength by class and section</CardTitle>
        <CardDescription>
          Total active students: {total}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.flatMap((grade) => {
              const sectionRows = byGrade[grade]!;
              const gradeTotal = sectionRows.reduce((s, r) => s + r.count, 0);
              return [
                ...sectionRows.map((r) => (
                  <TableRow key={`${r.grade}-${r.section}`}>
                    <TableCell className="font-medium">{r.grade}</TableCell>
                    <TableCell>{r.section}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                )),
                sectionRows.length > 1 ? (
                  <TableRow key={`${grade}-sub`} className="bg-muted/50">
                    <TableCell className="font-medium">Subtotal ({grade})</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{gradeTotal}</TableCell>
                  </TableRow>
                ) : null,
              ].filter(Boolean);
            })}
            <TableRow className="bg-primary/5 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell />
              <TableCell className="text-right">{total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
