import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Receipt } from "lucide-react";
import { ExpensesList } from "@/components/async/ExpensesList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-7 w-7 text-primary" />
          Expense management
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and manage school expenses.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
          <ExpensesList />
        </Suspense>
      </div>
    </div>
  );
}
