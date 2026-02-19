"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type YearRow = { id: string; name: string; sort_order: number };

export function FinancialYearsManager() {
  const router = useRouter();
  const [years, setYears] = useState<YearRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = createClient();

  const loadYears = () => {
    supabase
      .from("financial_years")
      .select("id, name, sort_order")
      .order("sort_order")
      .then(({ data }) => setYears((data ?? []) as YearRow[]));
  };

  useEffect(() => {
    loadYears();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmed = addName.trim();
    if (!trimmed) {
      setAddError("Year name is required (e.g. 2024-2025).");
      return;
    }
    setAddLoading(true);
    const { data: max } = await supabase
      .from("financial_years")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (max?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("financial_years").insert({
      name: trimmed,
      sort_order: nextOrder,
    });
    setAddLoading(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setAddOpen(false);
    setAddName("");
    loadYears();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this financial year?")) return;
    await supabase.from("financial_years").delete().eq("id", id);
    loadYears();
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Years</CardTitle>
        <CardDescription>List of financial/academic years for dropdowns (e.g. 2024-2025).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add financial year</DialogTitle>
              <DialogDescription>e.g. 2024-2025, 2025-2026</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{addError}</p>
              )}
              <div className="space-y-2">
                <Label>Year name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="2024-2025"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLoading}>
                  {addLoading ? "Adding…" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {years.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium">{y.name}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(y.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No financial years. Add one above.</p>
        )}
      </CardContent>
    </Card>
  );
}
