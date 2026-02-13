import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

export async function ExpensesList() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, amount, description, expense_date")
    .order("expense_date", { ascending: false })
    .limit(10);

  const canEdit = isAdminOrAbove(user);

  return (
    <>
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
            {canEdit ? "Latest expenses. Add new via the form." : "Read-only view."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses && expenses.length > 0 ? (
            <>
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
              {expenses.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">Showing latest 10</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
