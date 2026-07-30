"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import {
  ExpensePaymentsDialog,
  type ExpenseBillSummary,
} from "@/components/ExpensePaymentsDialog";
import {
  computeExpensePaymentTotals,
  expensePaymentStatusLabel,
} from "@/lib/expense-payments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IndianRupee, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatExpenseDisplayDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ExpenseHead = { id: string; name: string };
type Employee = { id: string; full_name: string };
type Expense = {
  id: string;
  expense_date: string;
  voucher: string | null;
  amount: number;
  party: string | null;
  expense_by: string | null;
  description: string | null;
  expense_head_id: string | null;
  expense_heads: { name: string } | null;
  expense_payments?: { amount: number }[] | null;
};

export default function ExpensesManager({ canEdit = true }: { canEdit?: boolean }) {
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentsExpense, setPaymentsExpense] = useState<ExpenseBillSummary | null>(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const supabase = useMemo(() => createClient(), []);

  const fetchRecentExpenses = useCallback(async () => {
    setLoadingRecent(true);
    const { data } = await supabase
      .from("expenses")
      .select("*, expense_heads(name), expense_payments(amount)")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentExpenses((data ?? []) as Expense[]);
    setLoadingRecent(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const [headsRes, employeesRes] = await Promise.all([
        supabase.from("expense_heads").select("id, name").order("sort_order"),
        supabase.from("employees").select("id, full_name").order("full_name"),
      ]);
      setExpenseHeads((headsRes.data ?? []) as ExpenseHead[]);
      setEmployees((employeesRes.data ?? []) as Employee[]);
    })();
    fetchRecentExpenses();
  }, [supabase, fetchRecentExpenses]);

  const editingExpense = useMemo(
    () => recentExpenses.find((e) => e.id === editingId),
    [recentExpenses, editingId]
  );

  const handleEditClick = (id: string) => {
    setEditingId(id);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingId(null);
  };

  const openPayments = (expense: Expense) => {
    setPaymentsExpense({
      id: expense.id,
      expense_date: expense.expense_date,
      voucher: expense.voucher,
      party: expense.party,
      amount: expense.amount,
      expense_heads: expense.expense_heads,
    });
    setPaymentsOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Expense bill deleted" });
      setDeleteTarget(null);
      fetchRecentExpenses();
    } catch (err) {
      toast({
        title: "Failed to delete bill",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-12 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <ExpenseEntryForm
              expenseHeads={expenseHeads}
              employees={employees}
              onSuccess={fetchRecentExpenses}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Recently Entered Expenses
                </h3>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[100px]">Voucher</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead className="text-right">Bill</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="max-w-[160px]">Description</TableHead>
                      <TableHead className="w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRecent ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : recentExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                          No recent expenses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentExpenses.map((expense) => {
                        const paid = (expense.expense_payments ?? []).reduce(
                          (s, p) => s + Number(p.amount ?? 0),
                          0
                        );
                        const totals = computeExpensePaymentTotals(expense.amount, paid);
                        return (
                          <TableRow key={expense.id}>
                            <TableCell className="text-xs">
                              {formatExpenseDisplayDate(expense.expense_date)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px]">
                              {expense.voucher ?? "—"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {expense.expense_heads?.name ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm">{expense.party ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {expense.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {totals.paid.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  totals.status === "paid"
                                    ? "default"
                                    : totals.status === "partial"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-[10px]"
                              >
                                {expensePaymentStatusLabel(totals.status)}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-xs text-muted-foreground truncate max-w-[160px]"
                              title={expense.description ?? ""}
                            >
                              {expense.description ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openPayments(expense)}
                                  >
                                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Record payment</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => handleEditClick(expense.id)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                                    onClick={() => setDeleteTarget(expense)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Expense Bill</DialogTitle>
              <DialogDescription>
                Modify bill details. Payments are managed separately.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              {editingExpense && (
                <ExpenseEntryForm
                  expenseHeads={expenseHeads}
                  employees={employees}
                  editingId={editingId}
                  onEdit={(id) => {
                    if (id === null) handleDialogClose(false);
                  }}
                  onSuccess={() => {
                    handleDialogClose(false);
                    fetchRecentExpenses();
                  }}
                  initialValues={{
                    voucher: editingExpense.voucher ?? "",
                    expense_head_id: editingExpense.expense_head_id ?? "",
                    party: editingExpense.party ?? "",
                    amount: editingExpense.amount,
                    expense_by: editingExpense.expense_by ?? "",
                    description: editingExpense.description ?? "",
                    expense_date: editingExpense.expense_date,
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <ExpensePaymentsDialog
          open={paymentsOpen}
          onOpenChange={setPaymentsOpen}
          expense={paymentsExpense}
          canEdit={canEdit}
          onChanged={fetchRecentExpenses}
        />

        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete expense bill?</DialogTitle>
              <DialogDescription>
                This permanently deletes the bill and all its payments.
              </DialogDescription>
            </DialogHeader>
            {deleteTarget && (
              <div className="text-sm space-y-1 rounded-md border bg-muted/20 p-3">
                <p>
                  <span className="text-muted-foreground">Voucher:</span>{" "}
                  {deleteTarget.voucher ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Amount:</span> ₹
                  {Number(deleteTarget.amount).toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Payments:</span>{" "}
                  {(deleteTarget.expense_payments ?? []).length} · paid ₹
                  {(deleteTarget.expense_payments ?? [])
                    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
