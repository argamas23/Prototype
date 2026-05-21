import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGoal, setGoal } from "@/services/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Goals() {
  const queryClient = useQueryClient();
  const { data: goal, isLoading } = useQuery({
    queryKey: ["goal"],
    queryFn: getGoal,
  });

  const [dailyCalories, setDailyCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (goal) {
      setDailyCalories(String(goal.dailyCalories));
      setProtein(String(goal.protein));
      setCarbs(String(goal.carbs));
      setFat(String(goal.fat));
      setTargetWeight(goal.targetWeightKg != null ? String(goal.targetWeightKg) : "");
    }
  }, [goal]);

  const mutation = useMutation({
    mutationFn: setGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to save goals"),
  });

  const handleSave = () => {
    setError(null);
    const cal = parseFloat(dailyCalories);
    if (isNaN(cal) || cal < 0) {
      setError("Daily calories must be a non-negative number.");
      return;
    }
    mutation.mutate({
      dailyCalories: cal,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      targetWeightKg: targetWeight ? parseFloat(targetWeight) : null,
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Health Goals</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Daily Calorie Goal (kcal)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 2000"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="150"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="200"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="65"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Target Weight (kg, optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 75"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-green-600">Goals saved!</p>}

            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Goals"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
