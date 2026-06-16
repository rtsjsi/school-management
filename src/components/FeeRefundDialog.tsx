"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { processFeeRefund } from "@/app/(workspace)/dashboard/fees/actions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeeRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeCollectionId: string;
  receiptNumber: string;
  maxRefundAmount: number;
  onSuccess?: () => void;
}

export function FeeRefundDialog({ open, onOpenChange, feeCollectionId, receiptNumber, maxRefundAmount, onSuccess }: FeeRefundDialogProps) {
  const [amount, setAmount] = useState(maxRefundAmount.toString());
  const [refundMode, setRefundMode] = useState<string>("cash");
  const [refundReason, setRefundReason] = useState("");
  const [refundDate, setRefundDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleRefund = async () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Refund amount must be greater than 0.", variant: "destructive" });
      return;
    }
    if (numAmount > maxRefundAmount) {
      toast({ title: "Invalid Amount", description: `Refund amount cannot exceed ₹${maxRefundAmount}`, variant: "destructive" });
      return;
    }
    if (!refundReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for the refund.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await processFeeRefund({
        feeCollectionId,
        amount: numAmount,
        refundMode,
        refundReason,
        refundDate,
      });

      if (result.ok) {
        toast({ title: "Refund Successful", description: "The fee refund has been recorded." });
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        toast({ title: "Refund Failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Record a refund for Receipt #{receiptNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Refund Amount (Max ₹{maxRefundAmount.toLocaleString("en-IN")}) *</Label>
            <Input
              type="number"
              min={1}
              max={maxRefundAmount}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Refund Mode *</Label>
              <Select value={refundMode} onValueChange={setRefundMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Refund Date *</Label>
              <DatePicker value={refundDate} onChange={setRefundDate} className="h-10" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Textarea
              placeholder="Why is this fee being refunded?"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRefund} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
