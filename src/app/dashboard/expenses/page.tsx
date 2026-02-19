import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { Receipt } from "lucide-react";
import ExpensesManager from "@/components/ExpensesManager";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const canEdit = isAdminOrAbove(user);

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

      <ExpensesManager canEdit={canEdit} />
    </div>
  );
}
