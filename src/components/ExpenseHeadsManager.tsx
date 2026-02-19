"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

type HeadRow = { id: string; name: string; budget: number | null; sort_order: number };

export function ExpenseHeadsManager() {
  const router = useRouter();
  const [heads, setHeads] = useState<HeadRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", budget: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const loadHeads = () => {
    supabase
      .from("expense_heads")
      .select("id, name, budget, sort_order")
      .order("sort_order")
      .then(({ data }) => setHeads((data ?? []) as HeadRow[]));
  };

  useEffect(() => {
    loadHeads();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = form.name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    const { data: max } = await supabase
      .from("expense_heads")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (max?.sort_order ?? 0) + 1;
    const budgetVal = form.budget.trim() ? parseFloat(form.budget) : null;
    if (form.budget.trim() && (isNaN(budgetVal!) || budgetVal! < 0)) {
      setError("Budget must be a non-negative number.");
      setLoading(false);
      return;
    }
    const { error: err } = await supabase.from("expense_heads").insert({
      name: trimmed,
      budget: budgetVal,
      sort_order: nextOrder,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setAddOpen(false);
    setForm({ name: "", budget: "" });
    loadHeads();
    router.refresh();
  };

  const handleEdit = (row: HeadRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      budget: row.budget != null ? String(row.budget) : "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    const trimmed = form.name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    const budgetVal = form.budget.trim() ? parseFloat(form.budget) : null;
    if (form.budget.trim() && (isNaN(budgetVal!) || budgetVal! < 0)) {
      setError("Budget must be a non-negative number.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase
      .from("expense_heads")
      .update({ name: trimmed, budget: budgetVal })
      .eq("id", editingId);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditOpen(false);
    setEditingId(null);
    setForm({ name: "", budget: "" });
    loadHeads();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense head? Expenses using it will have head set to null.")) return;
    await supabase.from("expense_heads").delete().eq("id", id);
    loadHeads();
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add head
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add expense head</DialogTitle>
              <DialogDescription>Create a new expense category with optional budget.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
              )}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Salary, Maintenance"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Budget (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding…" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit expense head</DialogTitle>
              <DialogDescription>Update name and budget.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
              )}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Budget (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {heads.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="text-right">
                      {h.budget != null ? Number(h.budget).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEdit(h)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(h.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No expense heads. Add one above.</p>
        )}
      </CardContent>
    </Card>
  );
}
