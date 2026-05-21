import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, upsertProfile } from "@/services/profile";
import type { Gender } from "@/types/health";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
  { label: "Prefer not to say", value: "PreferNotToSay" },
];

function parseCsv(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function validateTextTags(
  tags: string[],
  fieldLabel: string,
): { ok: true; value: string[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of tags) {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value) continue;
    if (value.length > 50) return { ok: false, error: `${fieldLabel} entries must be 50 characters or fewer.` };
    if (/\d/.test(value)) return { ok: false, error: `${fieldLabel} "${value}" should not contain numbers.` };
    if (!/[A-Za-z]/.test(value)) return { ok: false, error: `${fieldLabel} "${value}" should be text.` };

    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }

  return { ok: true, value: cleaned };
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [allergies, setAllergies] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setAge(profile.age != null ? String(profile.age) : "");
    setGender((profile.gender ?? "") as Gender | "");
    setHeightCm(profile.heightCm != null ? String(profile.heightCm) : "");
    setWeightKg(profile.weightKg != null ? String(profile.weightKg) : "");
    setDietaryPreferences((profile.dietaryPreferences ?? []).join(", "));
    setAllergies((profile.allergies ?? []).join(", "));
  }, [profile]);

  const payload = useMemo(() => {
    const parsedAge = age ? Number(age) : null;
    const parsedHeight = heightCm ? Number(heightCm) : null;
    const parsedWeight = weightKg ? Number(weightKg) : null;
    return {
      fullName: fullName.trim() ? fullName.trim() : null,
      age: age ? parsedAge : null,
      gender: gender || null,
      heightCm: heightCm ? parsedHeight : null,
      weightKg: weightKg ? parsedWeight : null,
    };
  }, [age, fullName, gender, heightCm, weightKg]);

  const mutation = useMutation({
    mutationFn: upsertProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to save profile"),
  });

  const handleSave = () => {
    setError(null);

    const prefResult = validateTextTags(parseCsv(dietaryPreferences), "Dietary preference");
    if (!prefResult.ok) {
      setError(prefResult.error);
      return;
    }

    const allergyResult = validateTextTags(parseCsv(allergies), "Allergy");
    if (!allergyResult.ok) {
      setError(allergyResult.error);
      return;
    }

    if (payload.age != null && (!Number.isFinite(payload.age) || payload.age < 0)) {
      setError("Age must be a non-negative number.");
      return;
    }
    if (payload.heightCm != null && (!Number.isFinite(payload.heightCm) || payload.heightCm < 0)) {
      setError("Height must be a non-negative number.");
      return;
    }
    if (payload.weightKg != null && (!Number.isFinite(payload.weightKg) || payload.weightKg < 0)) {
      setError("Weight must be a non-negative number.");
      return;
    }

    mutation.mutate({
      ...payload,
      dietaryPreferences: prefResult.value,
      allergies: allergyResult.value,
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Alex Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 22"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 175"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 72.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dietary Preferences (comma-separated)</Label>
              <Input
                placeholder="e.g. Vegetarian, Low carb"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Allergies (comma-separated)</Label>
              <Input
                placeholder="e.g. Peanuts, Lactose"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-green-600">Profile saved!</p>}

            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
