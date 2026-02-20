import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpensesManager from "@/components/ExpensesManager";
import { ExpenseHeadsManager } from "@/components/ExpenseHeadsManager";
import ExpenseReports from "@/components/ExpenseReports";

export default async function ExpensesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

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

      <Tabs defaultValue="entry" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 w-full overflow-x-auto">
          <TabsTrigger value="entry">Add Expense</TabsTrigger>
          <TabsTrigger value="heads">Expense Heads</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="entry" className="space-y-6">
          <ExpensesManager canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="heads" className="space-y-6">
          <ExpenseHeadsManager />
        </TabsContent>
        <TabsContent value="reports" className="space-y-6">
          <ExpenseReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
