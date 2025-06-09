-- Add unique constraint to prevent duplicate digests for same user and date
-- This ensures only one digest can exist per user per generation_date

-- First, clean up any existing duplicates (if any)
WITH duplicates AS (
  SELECT 
    user_id,
    generation_date,
    MIN(id) as keep_id
  FROM digests
  GROUP BY user_id, generation_date
  HAVING COUNT(*) > 1
)
DELETE FROM digests 
WHERE EXISTS (
  SELECT 1 FROM duplicates d 
  WHERE d.user_id = digests.user_id 
  AND d.generation_date = digests.generation_date 
  AND digests.id != d.keep_id
);

-- Add unique constraint on user_id and generation_date
ALTER TABLE digests 
ADD CONSTRAINT unique_user_generation_date 
UNIQUE (user_id, generation_date);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT unique_user_generation_date ON digests 
IS 'Ensures only one digest can exist per user per generation date to prevent duplicates'; 