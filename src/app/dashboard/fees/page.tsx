import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

      <Card>
        <CardHeader>
          <CardTitle>Fees</CardTitle>
          <CardDescription>Fee records and payment status will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Fee list will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
