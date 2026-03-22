"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getProfileAllowedClasses,
  setProfileAllowedClasses,
  type AllowedClassPair,
} from "@/app/dashboard/administration/actions";
import { fetchStandards } from "@/lib/lov";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Loader2, Plus, X } from "lucide-react";

type Standard = { id: string; name: string };
type Division = { id: string; name: string; standard_id: string };

export function UserClassAccessDialog({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [pairs, setPairs] = useState<AllowedClassPair[]>([]);
  const [addStandardId, setAddStandardId] = useState<string>("");
  const [addDivisionId, setAddDivisionId] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allowed, stds] = await Promise.all([
        getProfileAllowedClasses(profileId),
        fetchStandards(),
      ]);
      setPairs(allowed);
      setStandards(stds as Standard[]);
      const supabase = createClient();
      const { data: divs } = await supabase
        .from("standard_divisions")
        .select("id, name, standard_id")
        .order("standard_id")
        .order("name");
      setDivisions((divs ?? []) as Division[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (open) void loadData();
  }, [open, loadData]);

  const divisionsForStandard = addStandardId
    ? divisions.filter((d) => d.standard_id === addStandardId)
    : [];

  const addClass = () => {
    if (!addStandardId || !addDivisionId) return;
    if (pairs.some((p) => p.standardId === addStandardId && p.divisionId === addDivisionId)) return;
    setPairs((prev) => [...prev, { standardId: addStandardId, divisionId: addDivisionId }]);
    setAddStandardId("");
    setAddDivisionId("");
  };

  const removeClass = (standardId: string, divisionId: string) => {
    setPairs((prev) => prev.filter((p) => !(p.standardId === standardId && p.divisionId === divisionId)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await setProfileAllowedClasses(profileId, pairs);
    setSaving(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const stdName = (id: string) => standards.find((s) => s.id === id)?.name ?? id;
  const divName = (id: string) => divisions.find((d) => d.id === id)?.name ?? id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Class access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Class access</DialogTitle>
          <DialogDescription>
            Restrict which classes {displayName} can see (standards & divisions). Leave empty for no access. Principal/Admin are not restricted.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {pairs.map((p) => (
                <span
                  key={`${p.standardId}-${p.divisionId}`}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
                >
                  {stdName(p.standardId)} – {divName(p.divisionId)}
                  <button
                    type="button"
                    onClick={() => removeClass(p.standardId, p.divisionId)}
                    className="rounded p-0.5 hover:bg-muted-foreground/20"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Standard</Label>
                <Select value={addStandardId} onValueChange={(v) => { setAddStandardId(v); setAddDivisionId(""); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {standards.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Division</Label>
                <Select
                  value={addDivisionId}
                  onValueChange={setAddDivisionId}
                  disabled={!addStandardId}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisionsForStandard.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addClass} disabled={!addStandardId || !addDivisionId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
