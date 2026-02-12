import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench } from "lucide-react";

interface Props {
  skills: string[];
}

export const SkillsSection = ({ skills }: Props) => {
  if (!skills || skills.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" /> Skills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const SkillsSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-6 w-20" /></CardHeader>
    <CardContent className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-7 w-20" />)}
    </CardContent>
  </Card>
);
