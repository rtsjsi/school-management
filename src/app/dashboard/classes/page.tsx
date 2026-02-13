import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClassesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Classes
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage classes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class list</CardTitle>
          <CardDescription>Classes and sections will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Class list will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
