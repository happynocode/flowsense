-- Step 1: Drop the old unique constraint that only considered user_id and generation_date.
ALTER TABLE digests 
DROP CONSTRAINT unique_user_generation_date;

-- Step 2: Add a new, more flexible unique constraint.
-- This new constraint includes the 'title' field, allowing a user to have multiple
-- digests on the same day, as long as they have different titles (e.g., "Daily Digest" vs. "Weekly Recap").
ALTER TABLE digests 
ADD CONSTRAINT unique_user_generation_date_title 
UNIQUE (user_id, generation_date, title);

-- Add a comment to document the new constraint's purpose.
COMMENT ON CONSTRAINT unique_user_generation_date_title ON digests 
IS 'Ensures a user can only have one digest with the same title per day.'; 