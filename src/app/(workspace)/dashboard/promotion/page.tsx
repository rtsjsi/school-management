import { redirect } from "next/navigation";

export default async function PromotionPage() {
  redirect("/dashboard/academic-setup?tab=promotion");
}
