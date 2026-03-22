import { redirect } from "next/navigation";

/** Legacy URL: send users to sign-in. */
export default function NoDashboardAccessRedirectPage() {
  redirect("/login");
}
