import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Management",
  description: "Sign in to your school workspace.",
};

/** Public root always sends users to the login page. */
export default function HomePage() {
  redirect("/login");
}
