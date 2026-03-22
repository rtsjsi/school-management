import { redirect } from "next/navigation";

export default async function UsersPage() {
  redirect("/dashboard/administration?tab=users");
}
