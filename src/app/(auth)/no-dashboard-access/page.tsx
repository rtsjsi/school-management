import { redirect } from "next/navigation";

/** Legacy URL: everyone uses the home landing now. */
export default function NoDashboardAccessRedirectPage() {
  redirect("/");
}
