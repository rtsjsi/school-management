"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { approveFeeRefund, rejectFeeRefund } from "@/app/(workspace)/dashboard/fees/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

type PendingRefund = {
  id: string;
  fee_collection_id: string;
  amount: number;
  refund_date: string;
  refund_mode: string;
  refund_reason: string;
  created_at: string;
  fee_collections: {
    receipt_number: string;
    students: {
      full_name: string;
      standard: string;
    } | {
      full_name: string;
      standard: string;
    }[];
  };
};

export function RefundApprovals() {
  const [refunds, setRefunds] = useState<PendingRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPendingRefunds = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("fee_refunds")
      .select(`
        id, amount, refund_date, refund_mode, refund_reason, created_at, fee_collection_id,
        fee_collections(receipt_number, students(full_name, standard))
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch pending refunds", variant: "destructive" });
    } else {
      setRefunds((data as unknown) as PendingRefund[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchPendingRefunds();
  }, [fetchPendingRefunds]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const result = await approveFeeRefund(id);
    if (result.ok) {
      toast({ title: "Approved", description: "Refund has been approved successfully." });
      setRefunds(refunds.filter(r => r.id !== id));
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectDialogId) return;
    if (!rejectReason.trim()) {
      toast({ title: "Error", description: "Rejection reason is required.", variant: "destructive" });
      return;
    }

    setProcessingId(rejectDialogId);
    const result = await rejectFeeRefund(rejectDialogId, rejectReason);
    if (result.ok) {
      toast({ title: "Rejected", description: "Refund has been rejected." });
      setRefunds(refunds.filter(r => r.id !== rejectDialogId));
      setRejectDialogId(null);
      setRejectReason("");
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading pending approvals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Refund Approvals</CardTitle>
          <CardDescription>Review and approve pending fee refunds.</CardDescription>
        </CardHeader>
        <CardContent>
          {refunds.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No pending refunds require approval.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Requested</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund) => {
                    const student = Array.isArray(refund.fee_collections?.students)
                      ? refund.fee_collections?.students[0]
                      : refund.fee_collections?.students;

                    return (
                      <TableRow key={refund.id}>
                        <TableCell className="text-sm">
                          {format(new Date(refund.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{student?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{student?.standard ?? ""}</div>
                        </TableCell>
                        <TableCell>{refund.fee_collections?.receipt_number}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          ₹{Number(refund.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={refund.refund_reason}>
                          {refund.refund_reason}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleApprove(refund.id)}
                              disabled={processingId === refund.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setRejectDialogId(refund.id)}
                              disabled={processingId === refund.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this refund request. This will be recorded in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Discussed with parent, refund not applicable."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)} disabled={!!processingId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processingId}>
              {processingId === rejectDialogId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
