"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

const STATUSES = ["new", "contacted", "visit_scheduled", "admitted", "closed"] as const;

type Enquiry = {
  id: string;
  name: string;
  contact_phone: string | null;
  contact_email: string | null;
  class_of_interest: string | null;
  enquiry_date: string;
  status: string;
  notes: string | null;
  created_at: string;
};

function normalizeEnquiry(row: Record<string, unknown>): Enquiry {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    contact_phone: row.contact_phone != null ? String(row.contact_phone) : null,
    contact_email: row.contact_email != null ? String(row.contact_email) : null,
    class_of_interest: row.class_of_interest != null ? String(row.class_of_interest) : null,
    enquiry_date: row.enquiry_date != null ? String(row.enquiry_date) : "",
    status: String(row.status ?? "new"),
    notes: row.notes != null ? String(row.notes) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export function AdmissionEnquiryList() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Enquiry>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let q = supabase
      .from("admission_enquiries")
      .select("id, name, contact_phone, contact_email, class_of_interest, enquiry_date, status, notes, created_at")
      .order("enquiry_date", { ascending: false });

    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (search.trim()) {
      q = q.or(`name.ilike.%${search.trim()}%,contact_phone.ilike.%${search.trim()}%,contact_email.ilike.%${search.trim()}%`);
    }

    (async () => {
      try {
        const { data, error } = await q;
        setFetchError(error ? error.message : null);
        const rows = Array.isArray(data) ? data.map(normalizeEnquiry) : [];
        setEnquiries(rows);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load enquiries");
        setEnquiries([]);
      }
    })();
  }, [statusFilter, search]);

  const handleUpdate = async (id: string) => {
    const payload = {
      name: editForm.name ?? "",
      contact_phone: editForm.contact_phone ?? null,
      contact_email: editForm.contact_email ?? null,
      class_of_interest: editForm.class_of_interest ?? null,
      enquiry_date: editForm.enquiry_date ?? null,
      status: editForm.status ?? "new",
      notes: editForm.notes ?? null,
    };
    await supabase.from("admission_enquiries").update(payload).eq("id", id);
    setEditingId(null);
    setEditForm({});
    router.refresh();
    setEnquiries((prev) =>
      prev.map((e): Enquiry => {
        if (e.id !== id) return e;
        return {
          ...e,
          name: payload.name,
          contact_phone: payload.contact_phone,
          contact_email: payload.contact_email,
          class_of_interest: payload.class_of_interest,
          enquiry_date: payload.enquiry_date ?? e.enquiry_date,
          status: payload.status,
          notes: payload.notes,
        };
      })
    );
  };

  const startEdit = (e: Enquiry) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      contact_phone: e.contact_phone ?? "",
      contact_email: e.contact_email ?? "",
      class_of_interest: e.class_of_interest ?? "",
      enquiry_date: e.enquiry_date ?? "",
      status: e.status || "new",
      notes: e.notes ?? "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiry List</CardTitle>
        <CardDescription>View and update enquiries. Filter by status or search by name/contact.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fetchError && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{fetchError}</p>
        )}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Name, phone, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((e) => (
                <TableRow key={e.id}>
                  {editingId === e.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.name ?? ""}
                          onChange={(ev) => setEditForm((p) => ({ ...p, name: ev.target.value }))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.contact_phone ?? ""}
                          onChange={(ev) => setEditForm((p) => ({ ...p, contact_phone: ev.target.value }))}
                          placeholder="Phone"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.class_of_interest ?? ""}
                          onChange={(ev) => setEditForm((p) => ({ ...p, class_of_interest: ev.target.value }))}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={editForm.enquiry_date ?? ""}
                          onChange={(ev) => setEditForm((p) => ({ ...p, enquiry_date: ev.target.value }))}
                          className="h-8 w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.status ?? "new"}
                          onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleUpdate(e.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.contact_phone ?? e.contact_email ?? "—"}
                      </TableCell>
                      <TableCell>{e.class_of_interest ?? "—"}</TableCell>
                      <TableCell>
                        {e.enquiry_date
                          ? new Date(e.enquiry_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(e.status || "new").replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(e)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {enquiries.length === 0 && (
          <p className="text-sm text-muted-foreground">No enquiries found.</p>
        )}
      </CardContent>
    </Card>
  );
}
