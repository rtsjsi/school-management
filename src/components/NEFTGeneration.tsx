"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, AlertCircle } from "lucide-react";

export default function NEFTGeneration() {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    rows: { full_name: string; present_days: number; salary: number; net_amount: number; bank?: { account_number: string; ifsc_code: string; account_holder_name: string } }[];
    skipped: { full_name: string; net_amount: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/neft?monthYear=${monthYear}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Failed"); });
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);

  const downloadNEFT = () => {
    window.open(`/api/neft?monthYear=${monthYear}&format=neft`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          NEFT File Generation
        </CardTitle>
        <CardDescription>
          Generate NEFT file for bank transfer. Attendance must be approved for the selected month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
          </div>
          <Button variant="outline" onClick={fetchPreview} disabled={loading}>
            {loading ? "Loading…" : "Preview"}
          </Button>
          {data && data.rows.length > 0 && (
            <Button onClick={downloadNEFT}>
              <FileDown className="h-4 w-4 mr-2" />
              Download NEFT File
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Working days: {data.workingDays} | Payable: {data.rows.length} | Skipped: {data.skipped.length}
            </p>
            {data.rows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Present Days</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.full_name}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.present_days}</TableCell>
                      <TableCell>{r.salary.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{r.net_amount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bank ? `${r.bank.account_number} (${r.bank.ifsc_code})` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {data.skipped.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Skipped (no bank details or zero salary)</p>
                <div className="flex flex-wrap gap-2">
                  {data.skipped.map((s) => (
                    <Badge key={s.full_name} variant="secondary">{s.full_name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
