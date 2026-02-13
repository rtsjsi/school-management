import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Receipt } from "lucide-react";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, amount, description, expense_date")
    .order("expense_date", { ascending: false })
    .limit(100);

  const canEdit = isAdminOrAbove(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-7 w-7 text-primary" />
          Expense management
        </h1>
        <p className="text-muted-foreground mt-1">
          {canEdit
            ? "Add and manage school expenses (Admin & Super Admin)."
            : "View expense records (read-only)."}
        </p>
      </div>

      <div className={`grid gap-6 ${canEdit ? "lg:grid-cols-2" : ""}`}>
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Add expense</CardTitle>
              <CardDescription>Record a new expense.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseEntryForm />
            </CardContent>
          </Card>
        )}

        <Card className={canEdit ? "" : "lg:col-span-1"}>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              {canEdit ? "All expenses. Add new via the form." : "Read-only view."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenses && expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(e.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {e.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {canEdit ? "No expenses yet. Add one using the form." : "No expenses yet."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
