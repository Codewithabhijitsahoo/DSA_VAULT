import { addDays } from "date-fns";

export const RATINGS = [
  { value: 1, label: "Hard", color: "text-destructive", interval: 1 },
  { value: 2, label: "Medium", color: "text-warning", interval: 3 },
  { value: 3, label: "Easy", color: "text-primary", interval: 7 },
  { value: 4, label: "Very Easy", color: "text-success", interval: 14 },
];

export const calculateNextRevision = (ratingValue: number) => {
  const rating = RATINGS.find(r => r.value === ratingValue);
  const interval = rating ? rating.interval : 1;
  
  return {
    next_review_at: addDays(new Date(), interval).toISOString(),
    needs_revision: false,
    // We can expand this with more complex SM-2 logic later
  };
};
