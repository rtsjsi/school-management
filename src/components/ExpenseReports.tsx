"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="h-9 w-full min-w-0">
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
                className="h-9 w-full min-w-0"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                className="h-9 w-full min-w-0"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div className="space-y-2">
              <Label>Expense Head</Label>
              <Select value={expenseHeadId} onValueChange={setExpenseHeadId}>
                <SelectTrigger className="h-9 w-full min-w-0">
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
                <SelectTrigger className="h-9 w-full min-w-0">
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
                    className="h-9 w-full min-w-0"
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
                    className="h-9 w-full min-w-0"
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
                    className="h-9 w-full min-w-0"
                  />
                </div>
              </>
            )}
            <Button className="h-9 w-full sm:w-auto" onClick={fetchReport} disabled={loading}>
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
                      <TableHead className="hidden sm:table-cell">Voucher</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead className="hidden sm:table-cell">Party</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Mode</TableHead>
                      <TableHead className="hidden sm:table-cell">Expense By</TableHead>
                      <TableHead className="max-w-[160px] hidden sm:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.flatMap((row: Record<string, unknown>) => [
                      <TableRow key={String(row.id)}>
                        <TableCell className="text-sm">
                          {row.expense_date
                            ? new Date(row.expense_date as string).toLocaleDateString()
                            : "—"}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 px-2 sm:hidden"
                            onClick={() =>
                              setExpandedRows((prev) => ({
                                ...prev,
                                [String(row.id)]: !prev[String(row.id)],
                              }))
                            }
                          >
                            {expandedRows[String(row.id)] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Details
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs hidden sm:table-cell">{String(row.voucher ?? "—")}</TableCell>
                        <TableCell>{String(row.expense_head ?? "—")}</TableCell>
                        <TableCell className="hidden sm:table-cell">{String(row.party ?? "—")}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(row.amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize hidden sm:table-cell">{String(row.account ?? "—")}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{String(row.expense_by ?? "—")}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[160px] hidden sm:table-cell">
                          {String(row.description ?? "—")}
                        </TableCell>
                      </TableRow>,
                      expandedRows[String(row.id)] ? (
                        <TableRow key={`${String(row.id)}-details`} className="sm:hidden bg-muted/30">
                          <TableCell colSpan={3} className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">Voucher:</span> {String(row.voucher ?? "—")}</div>
                            <div><span className="text-muted-foreground">Party:</span> {String(row.party ?? "—")}</div>
                            <div><span className="text-muted-foreground">Mode:</span> {String(row.account ?? "—")}</div>
                            <div><span className="text-muted-foreground">Expense By:</span> {String(row.expense_by ?? "—")}</div>
                            <div><span className="text-muted-foreground">Description:</span> {String(row.description ?? "—")}</div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ])}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{totalAmount.toLocaleString()}</TableCell>
                      <TableCell colSpan={5} className="hidden sm:table-cell" />
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
