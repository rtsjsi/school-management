import { redirect } from "next/navigation";

export default async function AdmissionEnquiryPage() {
  redirect("/dashboard/students?tab=admission");
}
