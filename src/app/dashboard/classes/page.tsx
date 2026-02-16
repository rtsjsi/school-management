import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SECTION_LABELS: Record<string, string> = {
  pre_primary: "Pre-primary",
  primary: "Primary",
  secondary: "Secondary",
  higher_secondary: "Higher Secondary",
};

export default async function ClassesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, section, sort_order")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Classes
        </h1>
        <p className="text-muted-foreground mt-1">
          Pre-primary (Jr KG, Sr KG), Primary (1-8), Secondary (9-10), Higher Secondary (11-12).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class list</CardTitle>
          <CardDescription>Classes by section.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes && classes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{SECTION_LABELS[c.section] ?? c.section}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No classes. Run the seed script to populate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
