import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { FileQuestion } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExamsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileQuestion className="h-7 w-7 text-primary" />
          Exam management
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and manage exams and results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exams</CardTitle>
          <CardDescription>Exams and schedules will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Exam list will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
