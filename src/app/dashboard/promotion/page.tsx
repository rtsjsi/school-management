import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { PromotionRunner } from "@/components/PromotionRunner";

export default async function PromotionPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Year-end promotion
        </h1>
        <p className="text-muted-foreground mt-1">
          Close the current academic year, set promotion status from exam results, and create next-year enrollments.
        </p>
      </div>
      <PromotionRunner />
    </div>
  );
}
