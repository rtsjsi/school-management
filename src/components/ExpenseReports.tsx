"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;

type ReportType = "list" | "summary";

type ExpenseHead = { id: string; name: string };

export default function ExpenseReports() {
  const [reportType, setReportType] = useState<ReportType>("list");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expenseHeadId, setExpenseHeadId] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .from("expense_heads")
      .select("id, name")
      .order("sort_order")
      .then(({ data: heads }) => setExpenseHeads((heads ?? []) as ExpenseHead[]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", reportType);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (expenseHeadId && expenseHeadId !== "all") params.set("expenseHeadId", expenseHeadId);
    if (paymentMode && paymentMode !== "all") params.set("paymentMode", paymentMode);
    if (search.trim()) params.set("search", search.trim());
    if (minAmount.trim()) params.set("minAmount", minAmount.trim());
    if (maxAmount.trim()) params.set("maxAmount", maxAmount.trim());
    fetch(`/api/expense-reports?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  const totalAmount = Array.isArray(data)
    ? data.reduce((s, r) => s + Number(r.amount ?? r.total ?? 0), 0)
    : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Detailed List</SelectItem>
                  <SelectItem value="summary">By Payment Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div className="space-y-2">
              <Label>Expense Head</Label>
              <Select value={expenseHeadId} onValueChange={setExpenseHeadId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {expenseHeads.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reportType === "list" && (
              <>
                <div className="space-y-2">
                  <Label>Search</Label>
                  <Input
                    placeholder="Party, voucher, description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Any"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-24"
                  />
                </div>
              </>
            )}
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "Loading…" : "Generate"}
            </Button>
          </div>

          {data !== null && (
            <div className="border rounded-lg overflow-x-auto">
              {reportType === "summary" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row: Record<string, unknown>, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{String(row.payment_mode ?? "—")}</TableCell>
                        <TableCell>{Number(row.count ?? 0)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(row.total ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {data.reduce((s, r) => s + Number(r.total ?? 0), 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              {reportType === "list" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Expense By</TableHead>
                      <TableHead className="max-w-[160px]">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row: Record<string, unknown>) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="text-sm">
                          {row.expense_date
                            ? new Date(row.expense_date as string).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{String(row.voucher ?? "—")}</TableCell>
                        <TableCell>{String(row.expense_head ?? "—")}</TableCell>
                        <TableCell>{String(row.party ?? "—")}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(row.amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{String(row.account ?? "—")}</TableCell>
                        <TableCell className="text-sm">{String(row.expense_by ?? "—")}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[160px]">
                          {String(row.description ?? "—")}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{totalAmount.toLocaleString()}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              {Array.isArray(data) && data.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No data for this report.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
