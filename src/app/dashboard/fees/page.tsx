import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { DollarSign } from "lucide-react";
import { FeesList } from "@/components/async/FeesList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function FeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Fees management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage student fees and payments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={3} columns={4} />}>
          <FeesList />
        </Suspense>
      </div>
    </div>
  );
}
