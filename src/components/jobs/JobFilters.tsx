import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";

export interface JobFilterState {
  remote: "any" | "remote" | "hybrid" | "onsite";
  salaryMin: number;
  salaryMax: number;
  experienceLevel: string[];
  visaSponsorship: boolean;
  country: string;
  jobTypes: string[];
  verifiedOnly: boolean;
  aiMatchedOnly: boolean;
}

export const defaultFilters: JobFilterState = {
  remote: "any", salaryMin: 0, salaryMax: 200000, experienceLevel: [],
  visaSponsorship: false, country: "", jobTypes: [], verifiedOnly: false, aiMatchedOnly: false,
};

const EXPERIENCE = ["entry", "mid", "senior", "lead"];
const JOB_TYPES = ["full-time", "part-time", "contract", "freelance", "internship"];

interface Props { value: JobFilterState; onChange: (f: JobFilterState) => void; }

export default function JobFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<JobFilterState>) => onChange({ ...value, ...patch });
  const clear = () => onChange(defaultFilters);

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (value.remote !== "any") activeChips.push({ label: value.remote, onRemove: () => update({ remote: "any" }) });
  if (value.visaSponsorship) activeChips.push({ label: "Visa sponsor", onRemove: () => update({ visaSponsorship: false }) });
  if (value.verifiedOnly) activeChips.push({ label: "Verified only", onRemove: () => update({ verifiedOnly: false }) });
  if (value.aiMatchedOnly) activeChips.push({ label: "AI matched", onRemove: () => update({ aiMatchedOnly: false }) });
  if (value.country) activeChips.push({ label: value.country, onRemove: () => update({ country: "" }) });
  value.experienceLevel.forEach(l => activeChips.push({ label: l, onRemove: () => update({ experienceLevel: value.experienceLevel.filter(x => x !== l) }) }));
  value.jobTypes.forEach(l => activeChips.push({ label: l, onRemove: () => update({ jobTypes: value.jobTypes.filter(x => x !== l) }) }));

  const Body = (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Work mode</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {(["any", "remote", "hybrid", "onsite"] as const).map(m => (
            <Button key={m} size="sm" variant={value.remote === m ? "default" : "outline"} onClick={() => update({ remote: m })} className="capitalize">{m}</Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Salary range (USD)</Label>
        <div className="text-xs text-muted-foreground mt-1">${value.salaryMin.toLocaleString()} – ${value.salaryMax.toLocaleString()}</div>
        <Slider min={0} max={300000} step={5000} value={[value.salaryMin, value.salaryMax]} onValueChange={([min, max]) => update({ salaryMin: min, salaryMax: max })} className="mt-3" />
      </div>

      <div>
        <Label className="text-sm font-semibold">Experience level</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {EXPERIENCE.map(l => {
            const on = value.experienceLevel.includes(l);
            return <Button key={l} size="sm" variant={on ? "default" : "outline"} className="capitalize" onClick={() => update({ experienceLevel: on ? value.experienceLevel.filter(x => x !== l) : [...value.experienceLevel, l] })}>{l}</Button>;
          })}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Job type</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {JOB_TYPES.map(l => {
            const on = value.jobTypes.includes(l);
            return <Button key={l} size="sm" variant={on ? "default" : "outline"} className="capitalize" onClick={() => update({ jobTypes: on ? value.jobTypes.filter(x => x !== l) : [...value.jobTypes, l] })}>{l.replace("-", " ")}</Button>;
          })}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Country</Label>
        <Input className="mt-2" placeholder="e.g. Nigeria" value={value.country} onChange={e => update({ country: e.target.value })} />
      </div>

      <div className="flex items-center justify-between"><Label>Visa sponsorship</Label><Switch checked={value.visaSponsorship} onCheckedChange={v => update({ visaSponsorship: v })} /></div>
      <div className="flex items-center justify-between"><Label>Verified employers only</Label><Switch checked={value.verifiedOnly} onCheckedChange={v => update({ verifiedOnly: v })} /></div>
      <div className="flex items-center justify-between"><Label>AI-matched only</Label><Switch checked={value.aiMatchedOnly} onCheckedChange={v => update({ aiMatchedOnly: v })} /></div>

      <Button variant="outline" className="w-full" onClick={clear}>Clear all</Button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filters{activeChips.length > 0 && <Badge variant="secondary" className="ml-2">{activeChips.length}</Badge>}</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
            <div className="mt-4">{Body}</div>
          </SheetContent>
        </Sheet>
        {activeChips.map((c, i) => (
          <Badge key={i} variant="secondary" className="gap-1 capitalize">{c.label}<button onClick={c.onRemove} className="ml-0.5"><X className="h-3 w-3" /></button></Badge>
        ))}
        {activeChips.length > 0 && <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>}
      </div>
    </div>
  );
}
