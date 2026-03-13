"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FeeTypeRow = {
  id: string;
  name: string;
  code: string | null;
  sort_order: number;
  is_active: boolean;
};

export function FeeTypesManager() {
  const [types, setTypes] = useState<FeeTypeRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const load = () => {
    supabase
      .from("fee_types")
      .select("id, name, code, sort_order, is_active")
      .order("is_active", { ascending: false })
      .order("sort_order")
      .order("name")
      .then(({ data }) => setTypes((data ?? []) as FeeTypeRow[]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Fee type name is required.");
      return;
    }
    setLoading(true);
    const nextSort = (types[types.length - 1]?.sort_order ?? 0) + 1;
    const { error: err } = await supabase.from("fee_types").insert({
      name: trimmedName,
      code: code.trim() || null,
      sort_order: nextSort,
      is_active: true,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName("");
    setCode("");
    load();
  };

  const toggleActive = async (row: FeeTypeRow) => {
    const { error: err } = await supabase
      .from("fee_types")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (err) return;
    load();
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[2fr,1.5fr,auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="fee-type-name">Fee type name *</Label>
            <Input
              id="fee-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tuition, Transport"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-type-code">Code</Label>
            <Input
              id="fee-type-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Optional short code (e.g. TUIT)"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="invisible">Add</Label>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add type"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}
        {types.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleActive(t)}
                className="cursor-pointer"
              >
                <Badge
                  variant={t.is_active ? "default" : "outline"}
                  className={t.is_active ? "" : "opacity-60"}
                >
                  {t.name}
                  {t.code ? ` (${t.code})` : ""}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No fee types yet. Add one above.</p>
        )}
      </CardContent>
    </Card>
  );
}

