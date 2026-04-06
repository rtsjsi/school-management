import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove, isAccounts, canAccessExpenses } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpensesManager from "@/components/ExpensesManager";
import { ExpenseHeadsManager } from "@/components/ExpenseHeadsManager";
import ExpenseReports from "@/components/ExpenseReports";
import { ExpenseBudgetsManager } from "@/components/ExpenseBudgetsManager";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!canAccessExpenses(user)) redirect("/welcome");

  const canEdit = isAdminOrAbove(user) || isAccounts(user);

  return (
    <div className="space-y-6 sm:space-y-8">
      <Tabs defaultValue="entry" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          <TabsTrigger value="entry">Add</TabsTrigger>
          <TabsTrigger value="heads">Heads</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="entry" className="space-y-6">
          <ExpensesManager canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="heads" className="space-y-6">
          <ExpenseHeadsManager />
        </TabsContent>
        <TabsContent value="budgets" className="space-y-6">
          <ExpenseBudgetsManager />
        </TabsContent>
        <TabsContent value="reports" className="space-y-6">
          <ExpenseReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
