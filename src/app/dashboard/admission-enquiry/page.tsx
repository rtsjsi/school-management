import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { ClipboardList } from "lucide-react";
import { AdmissionEnquiryForm } from "@/components/AdmissionEnquiryForm";
import { AdmissionEnquiryList } from "@/components/AdmissionEnquiryList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function AdmissionEnquiryPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" />
          Admission Enquiry
        </h1>
        <p className="text-muted-foreground mt-1">
          Track prospective student enquiries and follow-ups.
        </p>
      </div>

      <AdmissionEnquiryForm />
      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
        <AdmissionEnquiryList />
      </Suspense>
    </div>
  );
}
