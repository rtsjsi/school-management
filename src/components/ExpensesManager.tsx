"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Loader2 } from "lucide-react";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

type ExpenseHead = { id: string; name: string };
type Employee = { id: string; full_name: string };
type Expense = {
  id: string;
  expense_date: string;
  voucher: string | null;
  amount: number;
  party: string | null;
  expense_by: string | null;
  account: string;
  description: string | null;
  expense_head_id: string | null;
  expense_heads: { name: string } | null;
  cheque_number: string | null;
  cheque_bank: string | null;
  cheque_date: string | null;
  transaction_reference_id: string | null;
};

export default function ExpensesManager({ canEdit = true }: { canEdit?: boolean }) {
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchRecentExpenses = useCallback(async () => {
    setLoadingRecent(true);
    const { data } = await supabase
      .from("expenses")
      .select("*, expense_heads(name)")
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

  const editingExpense = useMemo(() => 
    recentExpenses.find(e => e.id === editingId), 
  [recentExpenses, editingId]);

  const handleEditClick = (id: string) => {
    setEditingId(id);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingId(null);
  };

  if (!canEdit) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-12 space-y-6">
        {/* ADD NEW EXPENSE FORM (Main Page) */}
        <Card>
          <CardContent className="pt-6">
            <ExpenseEntryForm 
              expenseHeads={expenseHeads} 
              employees={employees} 
              onSuccess={fetchRecentExpenses}
            />
          </CardContent>
        </Card>

        {/* RECENT EXPENSES TABLE */}
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
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="max-w-[200px]">Description</TableHead>
                      <TableHead className="w-[80px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRecent ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : recentExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No recent expenses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-xs">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {expense.voucher ?? "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.expense_heads?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {expense.party ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {expense.account}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={expense.description ?? ""}>
                            {expense.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleEditClick(expense.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EDIT EXPENSE DIALOG */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Modify the details of the selected expense record.
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
                    account: editingExpense.account,
                    description: editingExpense.description ?? "",
                    expense_date: editingExpense.expense_date,
                    cheque_number: editingExpense.cheque_number ?? "",
                    cheque_bank: editingExpense.cheque_bank ?? "",
                    cheque_date: editingExpense.cheque_date ?? "",
                    transaction_reference_id: editingExpense.transaction_reference_id ?? "",
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
