"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

type Expense = {
  id: string;
  expense_date: string;
  voucher?: string;
  amount: number;
  description?: string;
  expense_by?: string;
  expense_head_id?: string;
  party?: string;
  account?: string;
  expense_heads?: { name: string } | { name: string }[] | null;
  category?: string;
};

type ExpenseHead = { id: string; name: string };
type Employee = { id: string; full_name: string };

export default function ExpensesManager({ canEdit = true }: { canEdit?: boolean }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    fromDate: "",
    toDate: "",
    expenseHeadId: "all",
    expenseBy: "all",
  });

  const supabase = createClient();

  const fetchExpenses = async () => {
    let q = supabase
      .from("expenses")
      .select("id, expense_date, voucher, amount, description, expense_by, expense_head_id, party, account, expense_heads(name), category")
      .order("expense_date", { ascending: false });

    if (filters.fromDate) q = q.gte("expense_date", filters.fromDate);
    if (filters.toDate) q = q.lte("expense_date", filters.toDate);
    if (filters.expenseHeadId && filters.expenseHeadId !== "all") q = q.eq("expense_head_id", filters.expenseHeadId);
    if (filters.expenseBy && filters.expenseBy !== "all") q = q.eq("expense_by", filters.expenseBy);

    const { data } = await q;
    const list = (data ?? []) as unknown as Expense[];

    setExpenses(list);
  };

  useEffect(() => {
    (async () => {
      const [headsRes, employeesRes] = await Promise.all([
        supabase.from("expense_heads").select("id, name").order("sort_order"),
        supabase.from("employees").select("id, full_name").order("full_name"),
      ]);
      setExpenseHeads((headsRes.data ?? []) as ExpenseHead[]);
      setEmployees((employeesRes.data ?? []) as Employee[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filters.fromDate, filters.toDate, filters.expenseHeadId, filters.expenseBy]);

  const handleView = () => {
    fetchExpenses();
  };

  const handleEdit = (exp: Expense) => {
    setEditingId(exp.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setEditingId(null);
    fetchExpenses();
  };

  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : null;
  const filteredExpenses = filters.search.trim()
    ? expenses.filter((e) => {
        const s = filters.search.trim().toLowerCase();
        const headName = Array.isArray(e.expense_heads) ? e.expense_heads[0]?.name : (e.expense_heads as { name?: string } | null)?.name;
        return (
          e.description?.toLowerCase().includes(s) ||
          headName?.toLowerCase().includes(s) ||
          e.expense_by?.toLowerCase().includes(s) ||
          e.voucher?.toLowerCase().includes(s)
        );
      })
    : expenses;
  const displayExpenses = filteredExpenses;
  const expenseByOptions = Array.from(new Set(expenses.map((e) => e.expense_by).filter(Boolean))) as string[];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {canEdit && (
      <div className="lg:col-span-4">
        <Card>
          <CardContent className="pt-6">
            <ExpenseEntryForm
              expenseHeads={expenseHeads}
              employees={employees}
              onEdit={setEditingId}
              editingId={editingId}
              initialValues={
                editingExpense
                  ? {
                      expense_date: editingExpense.expense_date,
                      voucher: editingExpense.voucher,
                      expense_head_id: editingExpense.expense_head_id,
                      party: editingExpense.party,
                      amount: editingExpense.amount,
                      expense_by: editingExpense.expense_by,
                      account: editingExpense.account,
                      description: editingExpense.description,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
      )}

      <div className={canEdit ? "lg:col-span-5" : "lg:col-span-9"}>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8">Loading…</p>
            ) : displayExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses found</p>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Expense By</TableHead>
                      <TableHead className="max-w-[120px]">Description</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">
                          {e.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          {(Array.isArray(e.expense_heads) ? e.expense_heads[0]?.name : (e.expense_heads as { name?: string } | null)?.name) ?? e.category ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(e.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[100px]">
                          {e.expense_by ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[120px]">
                          {e.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleEdit(e)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(e.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expense Head</Label>
              <Select
                value={filters.expenseHeadId}
                onValueChange={(v) => setFilters((p) => ({ ...p, expenseHeadId: v }))}
              >
                <SelectTrigger>
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
              <Label>Expense By</Label>
              <Select
                value={filters.expenseBy}
                onValueChange={(v) => setFilters((p) => ({ ...p, expenseBy: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {expenseByOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleView} className="w-full">
              View
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
