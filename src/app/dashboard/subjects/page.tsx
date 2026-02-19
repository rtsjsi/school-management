import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BookMarked } from "lucide-react";
import { SubjectMaster } from "@/components/SubjectMaster";

export default async function SubjectsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookMarked className="h-7 w-7 text-primary" />
          Subject management
        </h1>
        <p className="text-muted-foreground mt-1">
          Add subjects for each class. Choose grade-based or mark-based evaluation. Max marks are set per exam.
        </p>
      </div>
      <SubjectMaster />
    </div>
  );
}
