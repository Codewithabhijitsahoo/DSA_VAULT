-- Remove SM-2 columns from questions table
ALTER TABLE public.questions
DROP COLUMN IF EXISTS next_review_at,
DROP COLUMN IF EXISTS mastery_score,
DROP COLUMN IF EXISTS repetition_count,
DROP COLUMN IF EXISTS ease_factor,
DROP COLUMN IF EXISTS sm2_interval,
DROP COLUMN IF EXISTS sm2_repetitions,
DROP COLUMN IF EXISTS sm2_ease_factor;

DROP INDEX IF EXISTS idx_questions_next_review;
