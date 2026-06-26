"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { fetchAcademicYears } from "@/lib/lov";
import { formatFeeCollectionDisplayDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarRange,
  Calendar,
  Filter,
  Loader2,
  Undo2,
} from "lucide-react";

type ReportPreset = "day-wise" | "monthly" | "custom";

const PRESET_CONFIG: {
  value: ReportPreset;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "day-wise", label: "Day Wise", icon: Calendar },
  { value: "monthly", label: "Monthly", icon: Calendar },
  { value: "custom", label: "Custom Range", icon: Filter },
];

type ReportRow = {
  id: string;
  receipt_number: string;
  student_name?: string;
  student_standard?: string;
  student_division?: string;
  student_gr_no?: string;
  amount: number;
  refund_date: string;
  refund_mode: string;
  refund_reason: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
  processed_by?: string;
  approved_by?: string;
  academic_year: string;
};

type Summary = {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export default function FeeRefundReport() {
  const today = new Date().toISOString().split("T")[0];

  const [preset, setPreset] = useState<ReportPreset>("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [academicYear, setAcademicYear] = useState<string>("all");
  const [singleDate, setSingleDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [years, setYears] = useState<{ id: string; name: string; status?: string | null }[]>([]);

  useEffect(() => {
    fetchAcademicYears().then((y) => {
      setYears(y);
      const active = y.find((year) => year.status === 'active');
      if (active) setAcademicYear(active.name);
    });
  }, []);

  const [data, setData] = useState<ReportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  type SortKey = "refund_date" | "student_name" | "amount" | "status" | "receipt_number";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!data || !sortKey) return data;

    return [...data].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "receipt_number": av = a.receipt_number ?? ""; bv = b.receipt_number ?? ""; break;
        case "student_name": av = (a.student_name ?? "").toLowerCase(); bv = (b.student_name ?? "").toLowerCase(); break;
        case "amount": av = Number(a.amount); bv = Number(b.amount); break;
        case "refund_date": av = a.refund_date ?? ""; bv = b.refund_date ?? ""; break;
        case "status": av = a.status ?? ""; bv = b.status ?? ""; break;
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setExpandedRows({});
    try {
      const params = new URLSearchParams();

      if (preset === "day-wise") {
        params.append("dateFrom", singleDate);
        params.append("dateTo", singleDate);
      } else if (preset === "monthly") {
        params.append("month", month);
      } else if (preset === "custom") {
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
      }

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (academicYear && academicYear !== "all") {
        params.append("academicYear", academicYear);
      }

      params.append("limit", "1000"); // Limit to 1000 for safety

      const res = await fetch(`/api/fee-refund-report?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const rows: ReportRow[] = await res.json();
      setData(rows);

      // Calc summary
      let totalCount = 0;
      let totalAmount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      rows.forEach((r) => {
        totalCount++;
        totalAmount += Number(r.amount);
        if (r.status === 'pending') pendingCount++;
        if (r.status === 'approved') approvedCount++;
        if (r.status === 'rejected') rejectedCount++;
      });

      setSummary({ totalCount, totalAmount, pendingCount, approvedCount, rejectedCount });
    } catch (error) {
      console.error(error);
      setData([]);
      setSummary({ totalCount: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [preset, singleDate, month, dateFrom, dateTo, statusFilter, academicYear]);

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pending</Badge>;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* FILTERS */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_CONFIG.map((p) => {
              const Icon = p.icon;
              const active = preset === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4 rounded-xl border bg-muted/20">
            {preset === "day-wise" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
                <DatePicker value={singleDate} onChange={setSingleDate} />
              </div>
            )}

            {preset === "monthly" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Month</label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-9 w-full bg-background"
                />
              </div>
            )}

            {preset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">From Date</label>
                  <DatePicker value={dateFrom} onChange={setDateFrom} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">To Date</label>
                  <DatePicker value={dateTo} onChange={setDateTo} />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full sm:w-auto h-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        {data && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-muted/10 border-muted">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Amount</p>
                <p className="text-2xl font-bold">₹{summary.totalAmount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">{summary.totalCount} refunds</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-100">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full space-y-1">
                <p className="text-xs font-medium text-green-700 uppercase">Approved</p>
                <p className="text-2xl font-bold text-green-700">{summary.approvedCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50/50 border-orange-100">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full space-y-1">
                <p className="text-xs font-medium text-orange-700 uppercase">Pending</p>
                <p className="text-2xl font-bold text-orange-700">{summary.pendingCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 border-red-100">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full space-y-1">
                <p className="text-xs font-medium text-red-700 uppercase">Rejected</p>
                <p className="text-2xl font-bold text-red-700">{summary.rejectedCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TABLE */}
        {data && (
          <div className="space-y-4">
            <div className="rounded-md border">
              {data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("refund_date")}>
                        <div className="flex items-center gap-1">Date <SortIcon col="refund_date" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("student_name")}>
                        <div className="flex items-center gap-1">Student <SortIcon col="student_name" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("receipt_number")}>
                        <div className="flex items-center gap-1">Receipt No <SortIcon col="receipt_number" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("amount")}>
                        <div className="flex items-center gap-1">Amount <SortIcon col="amount" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData?.flatMap((row) => [
                      <TableRow key={row.id} className="group">
                        <TableCell className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setExpandedRows((prev) => ({
                                ...prev,
                                [row.id]: !prev[row.id],
                              }))
                            }
                          >
                            {expandedRows[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatFeeCollectionDisplayDate(row.refund_date)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.student_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{row.student_standard} {row.student_division}</div>
                        </TableCell>
                        <TableCell>{row.receipt_number}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          ₹{Number(row.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                      </TableRow>,
                      expandedRows[row.id] ? (
                        <TableRow key={`${row.id}-details`} className="bg-muted/30">
                          <TableCell colSpan={6} className="p-4 text-sm space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-muted-foreground">
                              <div><strong className="text-foreground">Reason:</strong> {row.refund_reason || "—"}</div>
                              <div><strong className="text-foreground">Requested By:</strong> {row.processed_by || "—"}</div>
                              <div><strong className="text-foreground">Requested At:</strong> {new Date(row.created_at).toLocaleString("en-IN")}</div>
                              
                              {row.status === 'approved' && (
                                <>
                                  <div><strong className="text-foreground">Approved By:</strong> {row.approved_by || "—"}</div>
                                  <div><strong className="text-foreground">Approved At:</strong> {row.approved_at ? new Date(row.approved_at).toLocaleString("en-IN") : "—"}</div>
                                </>
                              )}
                              
                              {row.status === 'rejected' && (
                                <div><strong className="text-foreground">Rejection Reason:</strong> {row.rejection_reason || "—"}</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ])}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No refunds match the selected filters.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
