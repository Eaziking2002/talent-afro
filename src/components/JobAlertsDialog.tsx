import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bell, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface JobAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JobAlertsDialog = ({ open, onOpenChange }: JobAlertsDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertExists, setAlertExists] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [minBudget, setMinBudget] = useState<number>(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("daily");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadJobAlert();
    }
  }, [open, user]);

  const loadJobAlert = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data: alert } = await supabase
        .from("job_alerts")
        .select("*")
        .eq("profile_id", profile.id)
        .single();

      if (alert) {
        setAlertExists(true);
        setAlertId(alert.id);
        setSkills(alert.skills as string[] || []);
        setLocations(alert.locations as string[] || []);
        setMinBudget(alert.min_budget || 0);
        setRemoteOnly(alert.remote_only || false);
        setFrequency(alert.frequency as "instant" | "daily" | "weekly" || "daily");
        setActive(alert.active ?? true);
      }
    } catch (error) {
      console.error("Error loading job alert:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (location: string) => {
    setLocations(locations.filter(l => l !== location));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile Not Found",
          description: "Please complete your profile setup first",
          variant: "destructive",
        });
        return;
      }

      // Ensure email is set
      if (!profile.email) {
        const { error: emailError } = await supabase
          .from("profiles")
          .update({ email: user.email })
          .eq("id", profile.id);

        if (emailError) throw emailError;
      }

      const alertData = {
        user_id: user.id,
        profile_id: profile.id,
        skills,
        locations,
        min_budget: minBudget,
        remote_only: remoteOnly,
        frequency,
        active,
      };

      if (alertExists && alertId) {
        const { error } = await supabase
          .from("job_alerts")
          .update(alertData)
          .eq("id", alertId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("job_alerts")
          .insert(alertData);

        if (error) throw error;
        setAlertExists(true);
      }

      toast({
        title: active ? "Job Alerts Enabled! 🔔" : "Job Alerts Updated",
        description: active 
          ? "You'll receive email notifications for matching jobs" 
          : "Your job alert preferences have been saved",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job alert:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save job alert settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Job Alert Settings
          </DialogTitle>
          <DialogDescription>
            Get notified when new jobs match your preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Job Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for matching jobs
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skills">Skills (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="skills"
                placeholder="e.g., React, Python, Design"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
              />
              <Button type="button" onClick={handleAddSkill} variant="outline">
                Add
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label htmlFor="locations">Preferred Locations (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="locations"
                placeholder="e.g., Remote, Nigeria, Kenya"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLocation())}
              />
              <Button type="button" onClick={handleAddLocation} variant="outline">
                Add
              </Button>
            </div>
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {locations.map((location) => (
                  <Badge key={location} variant="secondary" className="gap-1">
                    {location}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveLocation(location)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Min Budget */}
          <div className="space-y-2">
            <Label htmlFor="minBudget">Minimum Budget (USD)</Label>
            <Input
              id="minBudget"
              type="number"
              min="0"
              placeholder="0"
              value={minBudget}
              onChange={(e) => setMinBudget(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Remote Only */}
          <div className="flex items-center justify-between">
            <Label htmlFor="remoteOnly" className="cursor-pointer">Remote Jobs Only</Label>
            <Switch
              id="remoteOnly"
              checked={remoteOnly}
              onCheckedChange={setRemoteOnly}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Notification Frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (every new job)</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {active ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};