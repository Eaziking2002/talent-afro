import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, AlertTriangle } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  status: string;
  depends_on: string | null;
}

interface MilestoneDependenciesProps {
  milestones: Milestone[];
  contractId: string;
}

export function MilestoneDependencies({ milestones, contractId }: MilestoneDependenciesProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string>("");
  const [dependsOn, setDependsOn] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setDependency = useMutation({
    mutationFn: async ({ milestoneId, dependencyId }: { milestoneId: string; dependencyId: string | null }) => {
      // Check if this would create a circular dependency
      if (dependencyId) {
        const dependencyMilestone = milestones.find(m => m.id === dependencyId);
        if (dependencyMilestone?.depends_on === milestoneId) {
          throw new Error("Cannot create circular dependency");
        }
      }

      const { error } = await supabase
        .from("milestones")
        .update({ depends_on: dependencyId })
        .eq("id", milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast({ title: "Dependency updated successfully" });
      setSelectedMilestone("");
      setDependsOn("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkDependency = (milestone: Milestone) => {
    if (!milestone.depends_on) return null;
    
    const dependency = milestones.find(m => m.id === milestone.depends_on);
    if (!dependency) return null;

    const canStart = dependency.status === "approved" || dependency.status === "completed";
    
    return {
      dependency,
      canStart,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestone Dependencies</CardTitle>
        <CardDescription>
          Set dependencies to ensure milestones are completed in the correct order
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Set Dependency Form */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Add Dependency
          </h4>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Milestone</Label>
              <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Depends On</Label>
              <Select value={dependsOn} onValueChange={setDependsOn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dependency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dependency</SelectItem>
                  {milestones
                    .filter(m => m.id !== selectedMilestone)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() =>
              setDependency.mutate({
                milestoneId: selectedMilestone,
                dependencyId: dependsOn === "none" ? null : dependsOn,
              })
            }
            disabled={!selectedMilestone || !dependsOn || setDependency.isPending}
          >
            Set Dependency
          </Button>
        </div>

        {/* Dependency Chain Visualization */}
        <div className="space-y-3">
          <h4 className="font-semibold">Dependency Chain</h4>
          {milestones.map((milestone) => {
            const depInfo = checkDependency(milestone);
            
            return (
              <div key={milestone.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{milestone.title}</span>
                  <Badge variant={
                    milestone.status === "approved" ? "default" :
                    milestone.status === "in_progress" ? "secondary" :
                    "outline"
                  }>
                    {milestone.status}
                  </Badge>
                </div>

                {depInfo && (
                  <div className={`flex items-start gap-2 text-sm p-2 rounded ${
                    depInfo.canStart ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"
                  }`}>
                    {depInfo.canStart ? (
                      <Link2 className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        Depends on: {depInfo.dependency.title}
                      </p>
                      <p className={depInfo.canStart ? "text-green-700" : "text-yellow-700"}>
                        {depInfo.canStart
                          ? "Dependency completed. Can proceed."
                          : `Waiting for "${depInfo.dependency.title}" to be completed.`}
                      </p>
                    </div>
                  </div>
                )}

                {!depInfo && milestone.status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    No dependencies. Can start anytime.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
