import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  className?: string;
  highlight?: boolean;
};

export function StatCard({ label, value, unit, sub, className, highlight }: StatCardProps) {
  return (
    <Card className={cn("border-border/50", highlight && "border-primary/30 bg-primary/5", className)}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-2xl font-bold mt-1", highlight ? "text-primary" : "text-foreground")}>
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
