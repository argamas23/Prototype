import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeImage, logMeal, updateMeal } from "@/services/meals";
import type { Meal, MealType } from "@/types/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/shared/DateInput";
import { toast } from "@/components/ui/use-toast";
import { getLocalDateString, getLocalTimeString } from "@/lib/datetime";
import { Plus, Trash2 } from "lucide-react";

type ItemRow = {
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const emptyItem = (): ItemRow => ({
  name: "",
  quantity: "",
  unit: "serving",
  calories: "",
  protein: "0",
  carbs: "0",
  fat: "0",
});

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const MAX_QUANTITY = 10000;
const MAX_CALORIES = 10000;
const MAX_MACRO_GRAMS = 1000;

function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function inferMealTypeFromTime(time: string): MealType {
  const mins = parseTimeToMinutes(time);
  if (mins == null) return "Lunch";

  // Breakfast: 05:00-10:59, Lunch: 11:00-15:59, Snacks: 16:00-18:59 + 23:00-04:59, Dinner: 19:00-22:59
  if (mins >= 5 * 60 && mins < 11 * 60) return "Breakfast";
  if (mins >= 11 * 60 && mins < 16 * 60) return "Lunch";
  if (mins >= 16 * 60 && mins < 19 * 60) return "Snacks";
  if (mins >= 19 * 60 && mins < 23 * 60) return "Dinner";
  return "Snacks";
}

function parseBoundedNumber(value: string, max: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
}

function parseOptionalBoundedNumber(value: string, max: number) {
  return value.trim() ? parseBoundedNumber(value, max) : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function isRowEmpty(item: ItemRow) {
  return (
    !item.name.trim() &&
    !item.quantity.trim() &&
    !item.calories.trim() &&
    !item.protein.trim() &&
    !item.carbs.trim() &&
    !item.fat.trim()
  );
}

function validateItem(item: ItemRow, idx: number): { item?: ParsedItem; error?: string } {
  if (isRowEmpty(item)) return {};

  const rowLabel = `Item ${idx + 1}`;
  const name = item.name.trim();
  if (!name) return { error: `${rowLabel}: enter a food name.` };

  const quantity = parseBoundedNumber(item.quantity, MAX_QUANTITY);
  if (quantity == null) {
    return { error: `${rowLabel}: quantity must be between 0 and ${formatNumber(MAX_QUANTITY)}.` };
  }

  const calories = parseBoundedNumber(item.calories, MAX_CALORIES);
  if (calories == null) {
    return { error: `${rowLabel}: calories must be between 0 and ${formatNumber(MAX_CALORIES)}.` };
  }

  const protein = parseOptionalBoundedNumber(item.protein, MAX_MACRO_GRAMS);
  if (protein == null) {
    return { error: `${rowLabel}: protein must be between 0 and ${formatNumber(MAX_MACRO_GRAMS)}g.` };
  }

  const carbs = parseOptionalBoundedNumber(item.carbs, MAX_MACRO_GRAMS);
  if (carbs == null) {
    return { error: `${rowLabel}: carbs must be between 0 and ${formatNumber(MAX_MACRO_GRAMS)}g.` };
  }

  const fat = parseOptionalBoundedNumber(item.fat, MAX_MACRO_GRAMS);
  if (fat == null) {
    return { error: `${rowLabel}: fat must be between 0 and ${formatNumber(MAX_MACRO_GRAMS)}g.` };
  }

  return {
    item: {
      name,
      quantity,
      unit: item.unit.trim() || "g",
      calories,
      protein,
      carbs,
      fat,
    },
  };
}

export default function LogMeal() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const today = getLocalDateString();
  const editMeal = (location.state as { editMeal?: Meal } | null)?.editMeal;
  const isEditing = Boolean(editMeal);

  const initialTime = editMeal?.time ?? getLocalTimeString();
  const [mealTypeTouched, setMealTypeTouched] = useState(false);
  const [mealType, setMealType] = useState<MealType>(editMeal?.mealType ?? inferMealTypeFromTime(initialTime));
  const [date, setDate] = useState(editMeal?.date ?? today);
  const [time, setTime] = useState(initialTime);
  const [items, setItems] = useState<ItemRow[]>(
    () =>
      editMeal
        ? editMeal.items.map((item) => ({
            name: item.name,
            quantity: String(item.quantity),
            unit: item.unit,
            calories: String(item.calories),
            protein: String(item.protein),
            carbs: String(item.carbs),
            fat: String(item.fat),
          }))
        : [emptyItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          calories: acc.calories + (parseBoundedNumber(item.calories, MAX_CALORIES) ?? 0),
          protein: acc.protein + (parseBoundedNumber(item.protein, MAX_MACRO_GRAMS) ?? 0),
          carbs: acc.carbs + (parseBoundedNumber(item.carbs, MAX_MACRO_GRAMS) ?? 0),
          fat: acc.fat + (parseBoundedNumber(item.fat, MAX_MACRO_GRAMS) ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  );

  const mutation = useMutation({
    mutationFn: (payload) => (editMeal ? updateMeal(editMeal.id, payload) : logMeal(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      toast({
        title: isEditing ? "Meal updated" : "Meal logged",
        description: isEditing
          ? "Your changes were saved and synced with the dashboard."
          : "Your meal was saved and synced with the dashboard.",
      });
      navigate("/dashboard");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to log meal";
      setError(message);
      toast({
        variant: "destructive",
        title: "Could not save meal",
        description: message,
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeImage,
    onSuccess: (data) => {
      const newItems: ItemRow[] = data.map(item => ({
        name: item.name,
        quantity: item.quantity.toString(),
        unit: item.unit,
        calories: item.calories.toString(),
        protein: item.protein.toString(),
        carbs: item.carbs.toString(),
        fat: item.fat.toString(),
      }));
      setItems(newItems.length > 0 ? newItems : [emptyItem()]);
      toast({
        title: "Image analyzed",
        description: `Found ${newItems.length} food items.`,
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to analyze image";
      setError(message);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: message,
      });
    },
  });

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  useEffect(() => {
    if (isEditing) return;
    if (mealTypeTouched) return;
    setMealType(inferMealTypeFromTime(time));
  }, [isEditing, mealTypeTouched, time]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setError(null);
    if (!date || !time) {
      setError("Choose a valid date and time.");
      return;
    }
    if (date > today) {
      setError("Meal date cannot be in the future.");
      return;
    }
    if (date === today) {
      const currentTime = getLocalTimeString();
      if (time > currentTime) {
        setError("Meal time cannot be in the future.");
        return;
      }
    }

    const validItems: ParsedItem[] = [];
    for (let idx = 0; idx < items.length; idx += 1) {
      const result = validateItem(items[idx], idx);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.item) validItems.push(result.item);
    }

    if (validItems.length === 0) {
      setError("Add at least one food item with a name, quantity, and calories.");
      return;
    }

    mutation.mutate({ mealType, date, time, items: validItems });
  };

  const handleAnalyze = () => {
    if (!imageFile) {
      setError("Please select an image file.");
      return;
    }
    setError(null);
    analyzeMutation.mutate(imageFile);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isEditing ? "Edit Meal" : "Log Meal"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add one or more foods and HealthSync will total the meal for your dashboard.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="meal-type">Type</Label>
              <Select
                value={mealType}
                onValueChange={(v) => {
                  setMealTypeTouched(true);
                  setMealType(v as MealType);
                }}
              >
                <SelectTrigger id="meal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meal-date">Date</Label>
              <DateInput id="meal-date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meal-time">Time</Label>
              <Input id="meal-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Image Analysis (Optional)</CardTitle>
          <p className="text-sm text-muted-foreground">Upload a photo of your meal to automatically detect and calculate nutrients.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meal-image">Meal Image</Label>
            <Input
              id="meal-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={!imageFile || analyzeMutation.isPending}
            variant="outline"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Image"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Food Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="border border-border/50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(idx)}
                    aria-label={`Remove item ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs" htmlFor={`meal-item-name-${idx}`}>
                    Food Name
                  </Label>
                  <Input
                    id={`meal-item-name-${idx}`}
                    placeholder="e.g. Grilled Chicken"
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`meal-item-calories-${idx}`}>
                    Calories (kcal)
                  </Label>
                  <Input
                    id={`meal-item-calories-${idx}`}
                    type="number"
                    min="0"
                    max={MAX_CALORIES}
                    placeholder="0"
                    value={item.calories}
                    onChange={(e) => updateItem(idx, "calories", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`meal-item-quantity-${idx}`}>
                    Qty
                  </Label>
                  <Input
                    id={`meal-item-quantity-${idx}`}
                    type="number"
                    min="0"
                    max={MAX_QUANTITY}
                    placeholder="100"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`meal-item-protein-${idx}`}>
                    Protein (g)
                  </Label>
                  <Input
                    id={`meal-item-protein-${idx}`}
                    type="number"
                    min="0"
                    max={MAX_MACRO_GRAMS}
                    value={item.protein}
                    onChange={(e) => updateItem(idx, "protein", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`meal-item-carbs-${idx}`}>
                    Carbs (g)
                  </Label>
                  <Input
                    id={`meal-item-carbs-${idx}`}
                    type="number"
                    min="0"
                    max={MAX_MACRO_GRAMS}
                    value={item.carbs}
                    onChange={(e) => updateItem(idx, "carbs", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`meal-item-fat-${idx}`}>
                    Fat (g)
                  </Label>
                  <Input
                    id={`meal-item-fat-${idx}`}
                    type="number"
                    min="0"
                    max={MAX_MACRO_GRAMS}
                    value={item.fat}
                    onChange={(e) => updateItem(idx, "fat", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-primary/5">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calories</p>
            <p className="text-lg font-semibold text-foreground">{formatNumber(totals.calories)} kcal</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Protein</p>
            <p className="text-lg font-semibold text-foreground">{formatNumber(totals.protein)}g</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Carbs</p>
            <p className="text-lg font-semibold text-foreground">{formatNumber(totals.carbs)}g</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fat</p>
            <p className="text-lg font-semibold text-foreground">{formatNumber(totals.fat)}g</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Save Meal"}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
