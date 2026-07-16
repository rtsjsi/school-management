"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDown, AlertCircle, RefreshCw, CalendarDays, Users, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NEFTGeneration() {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    rows: {
      full_name: string;
      present_days: number;
      attendance_days?: number;
      sandwich_deduction?: number;
      late_in_count?: number;
      late_in_deduction?: number;
      salary: number;
      net_amount: number;
      bank?: { account_number: string; ifsc_code: string; account_holder_name: string };
    }[];
    skipped: { full_name: string; net_amount: number }[];
    settings?: { debitAccount: string; transactionType: string; currency: string; remarksPrefix: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debitAccount, setDebitAccount] = useState("");
  const [transactionType, setTransactionType] = useState("NEFT");
  const [remarksPrefix, setRemarksPrefix] = useState("Salary");
  const [valueDate, setValueDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchPreview = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/neft?monthYear=${monthYear}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Failed"); });
        return r.json();
      })
      .then((d) => {
        setData(d);
        if (d.settings) {
          if (d.settings.debitAccount) setDebitAccount(d.settings.debitAccount);
          if (d.settings.transactionType) setTransactionType(d.settings.transactionType);
          if (d.settings.remarksPrefix) setRemarksPrefix(d.settings.remarksPrefix);
        }
      })
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
    if (!debitAccount.trim()) {
      setError("Enter the Debit Account Number (your IDFC FIRST account) before generating the file.");
      return;
    }
    const params = new URLSearchParams({
      monthYear,
      format: "blkpay",
      debitAccount: debitAccount.trim(),
      transactionType,
      remarksPrefix: remarksPrefix.trim() || "Salary",
      valueDate,
    });
    window.open(`/api/neft?${params.toString()}`, "_blank");
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payroll Month</Label>
              <Input 
                type="month" 
                value={monthYear} 
                onChange={(e) => setMonthYear(e.target.value)} 
                className="h-9 w-[180px] sm:w-[200px] bg-background"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchPreview} disabled={loading} className="h-9 px-3 gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Loading…" : "Preview"}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {data && data.rows.length > 0 && (
              <Button size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={downloadNEFT}>
                <FileDown className="h-4 w-4" />
                Download Bank File
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="rounded-md border bg-muted/20 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            Bank File Settings (IDFC FIRST BLKPAY)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Debit Account Number *</Label>
              <Input
                value={debitAccount}
                onChange={(e) => setDebitAccount(e.target.value)}
                placeholder="Your IDFC FIRST account"
                className="font-mono bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Transaction Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEFT">NEFT (other bank)</SelectItem>
                  <SelectItem value="IFT">IFT (within IDFC)</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Transaction Date</Label>
              <Input type="date" value={valueDate} onChange={(e) => setValueDate(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold uppercase">Remarks Prefix</Label>
              <Input value={remarksPrefix} onChange={(e) => setRemarksPrefix(e.target.value)} placeholder="Salary" className="bg-background" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            Currency is INR. Output remarks: <span className="font-medium text-foreground/70">"{remarksPrefix || "Salary"} {new Date(`${monthYear}-01T00:00:00`).toLocaleString("en-US", { month: "short", year: "numeric" })}"</span>. 
            Settings are saved securely as defaults for your next generation.
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground animate-pulse">
            Generating NEFT preview...
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md dark:bg-blue-900/30 dark:text-blue-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Working Days</p>
                    <p className="text-2xl font-bold">{data.workingDays}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md dark:bg-emerald-900/30 dark:text-emerald-400">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payable Accounts</p>
                    <p className="text-2xl font-bold">{data.rows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-md dark:bg-rose-900/30 dark:text-rose-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Skipped (Missing Bank/Zero Salary)</p>
                    <p className="text-2xl font-bold">{data.skipped.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.rows.length > 0 && (
              <div className="rounded-md border border-border/60 overflow-hidden shadow-sm">
                <div className="flex-1 overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Employee</TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Payable Days</TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Deductions</TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Base Salary</TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Net Amount</TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--border))] font-semibold">Account</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((r) => (
                        <TableRow key={r.full_name} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{r.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex flex-col">
                              <span>{r.present_days}</span>
                              {typeof r.attendance_days === "number" && r.attendance_days !== r.present_days && (
                                <span className="text-[10px] text-muted-foreground">from {r.attendance_days} attended</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {(r.sandwich_deduction || r.late_in_deduction)
                              ? [
                                  r.sandwich_deduction ? `Sandwich −${r.sandwich_deduction}` : null,
                                  r.late_in_deduction
                                    ? `Late IN −${r.late_in_deduction} (${r.late_in_count ?? 0}×)`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">₹{r.salary.toLocaleString()}</TableCell>
                          <TableCell className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹{r.net_amount.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.bank ? (
                              <div className="flex flex-col">
                                <span>{r.bank.account_number}</span>
                                <span className="text-muted-foreground">{r.bank.ifsc_code}</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {data.skipped.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Skipped Employees
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.skipped.map((s) => (
                    <Badge key={s.full_name} variant="outline" className="bg-muted/30 text-muted-foreground border-border/60">
                      {s.full_name}
                    </Badge>
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
