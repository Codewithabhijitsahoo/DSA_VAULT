import { Badge } from "@/components/ui/badge";

export function DifficultyBadge({ level }: { level: "easy" | "medium" | "hard" }) {
  const styles = {
    easy: "bg-easy/15 text-easy border-easy/30",
    medium: "bg-medium/15 text-medium border-medium/30",
    hard: "bg-hard/15 text-hard border-hard/30",
  };
  return (
    <Badge variant="outline" className={`${styles[level]} font-medium capitalize text-[10px] uppercase tracking-wider`}>
      {level}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: "solved" | "pending" | "revisit" }) {
  const styles = {
    solved: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    revisit: "bg-info/15 text-info border-info/30",
  };
  return (
    <Badge variant="outline" className={`${styles[status]} font-medium capitalize text-[10px]`}>
      {status}
    </Badge>
  );
}
