import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BookOpen } from "lucide-react";

export default async function ClassesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-7 w-7" />
        Classes
      </h1>
      <p className="text-muted-foreground mt-1">
        View and manage classes.
      </p>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-8 text-center text-muted-foreground">
        Class list will be added here.
      </div>
    </div>
  );
}
