"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Calendar, History, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";

export function EmployeePayrollInfo({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    salaryHistory: any[];
    leaveBalances: any[];
  } | null>(null);

  const [showAddSalary, setShowAddSalary] = useState(false);
  const [newSalary, setNewSalary] = useState({
    effective_from_date: new Date().toISOString().split('T')[0],
    basic_salary: "",
    allowance: "",
    child_allowance: "",
    pf_deduction: ""
  });

  const [editingLeave, setEditingLeave] = useState<{ id: string, allocated: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/payroll`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error loading payroll info" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const handleAddSalary = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_salary_revision", payload: newSalary })
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Salary revision added" });
      setShowAddSalary(false);
      setNewSalary({
        effective_from_date: new Date().toISOString().split('T')[0],
        basic_salary: "",
        allowance: "",
        child_allowance: "",
        pf_deduction: ""
      });
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to add salary revision" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLeave = async (leave: any) => {
    if (!editingLeave) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "update_leave_balance", 
          payload: { 
            academic_year: leave.academic_year, 
            leave_type: leave.leave_type,
            allocated_days: editingLeave.allocated
          } 
        })
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Leave balance updated" });
      setEditingLeave(null);
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update leave" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4 text-center">Loading payroll info...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 mt-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Salary History
              </CardTitle>
              <CardDescription>Timeline of compensation revisions</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddSalary(!showAddSalary)} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              New Revision
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {showAddSalary && (
            <div className="bg-muted/30 p-4 rounded-md border border-border/50 mb-4 space-y-4">
              <h4 className="text-sm font-medium">Add Salary Revision</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Effective From</Label>
                  <DatePicker value={newSalary.effective_from_date} onChange={v => setNewSalary(p => ({ ...p, effective_from_date: v || "" }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Basic (₹)</Label>
                  <Input type="number" value={newSalary.basic_salary} onChange={e => setNewSalary(p => ({ ...p, basic_salary: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Allowance (₹)</Label>
                  <Input type="number" value={newSalary.allowance} onChange={e => setNewSalary(p => ({ ...p, allowance: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Child Allow (₹)</Label>
                  <Input type="number" value={newSalary.child_allowance} onChange={e => setNewSalary(p => ({ ...p, child_allowance: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PF Deduct (₹)</Label>
                  <Input type="number" value={newSalary.pf_deduction} onChange={e => setNewSalary(p => ({ ...p, pf_deduction: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowAddSalary(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddSalary} disabled={saving || !newSalary.effective_from_date}>Save Revision</Button>
              </div>
            </div>
          )}

          {data.salaryHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">No salary history recorded.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Allowance</TableHead>
                    <TableHead className="text-right">Child Allw.</TableHead>
                    <TableHead className="text-right text-rose-600">PF</TableHead>
                    <TableHead className="text-right font-bold">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.salaryHistory.map((s, i) => {
                    const net = Number(s.basic_salary) + Number(s.allowance) + Number(s.child_allowance) - Number(s.pf_deduction);
                    return (
                      <TableRow key={s.id} className={i === 0 ? "bg-primary/5 font-medium" : ""}>
                        <TableCell>{s.effective_from_date} {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm">Current</span>}</TableCell>
                        <TableCell className="text-right">₹{s.basic_salary}</TableCell>
                        <TableCell className="text-right">₹{s.allowance}</TableCell>
                        <TableCell className="text-right">₹{s.child_allowance}</TableCell>
                        <TableCell className="text-right text-rose-600">₹{s.pf_deduction}</TableCell>
                        <TableCell className="text-right font-bold text-primary">₹{net.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Leave Balances
            </CardTitle>
            <CardDescription>Annual leave quotas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {data.leaveBalances.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">No leave balances found.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead className="text-center">Used Days</TableHead>
                    <TableHead className="text-center">Allocated</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leaveBalances.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.academic_year}</TableCell>
                      <TableCell className="capitalize">{l.leave_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-center text-rose-600 font-medium">{l.used_days}</TableCell>
                      <TableCell className="text-center">
                        {editingLeave?.id === l.id ? (
                          <Input 
                            type="number" 
                            className="w-16 h-7 text-center mx-auto" 
                            value={editingLeave.allocated}
                            onChange={e => setEditingLeave(p => p ? { ...p, allocated: e.target.value } : null)}
                          />
                        ) : (
                          l.allocated_days
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {Number(l.allocated_days) - Number(l.used_days)}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingLeave?.id === l.id ? (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleUpdateLeave(l)} disabled={saving}>
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingLeave({ id: l.id, allocated: String(l.allocated_days) })}>
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
