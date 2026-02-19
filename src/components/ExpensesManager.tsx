"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import { Card, CardContent } from "@/components/ui/card";

type ExpenseHead = { id: string; name: string };
type Employee = { id: string; full_name: string };

export default function ExpensesManager({ canEdit = true }: { canEdit?: boolean }) {
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [headsRes, employeesRes] = await Promise.all([
        supabase.from("expense_heads").select("id, name").order("sort_order"),
        supabase.from("employees").select("id, full_name").order("full_name"),
      ]);
      setExpenseHeads((headsRes.data ?? []) as ExpenseHead[]);
      setEmployees((employeesRes.data ?? []) as Employee[]);
    })();
  }, []);

  if (!canEdit) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <Card>
          <CardContent className="pt-6">
            <ExpenseEntryForm expenseHeads={expenseHeads} employees={employees} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
