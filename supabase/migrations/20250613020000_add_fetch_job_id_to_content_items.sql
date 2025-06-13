-- Step 1: Add the new column to store the link to the fetch job.
-- We allow it to be NULL initially for existing records.
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS fetch_job_id BIGINT;

-- Step 2: Add a foreign key constraint to ensure data integrity.
-- This links each content item to the specific job that fetched it.
-- We use "ON DELETE SET NULL" so that if a fetch job is deleted,
-- the content item is not deleted, but its link to the job is removed.
-- We add a check to only create the constraint if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_content_items_fetch_job_id'
  ) THEN
    ALTER TABLE public.content_items
    ADD CONSTRAINT fk_content_items_fetch_job_id
    FOREIGN KEY (fetch_job_id) 
    REFERENCES public.source_fetch_jobs(id) 
    ON DELETE SET NULL;
  END IF;
END;
$$;

-- Step 3: Add an index to improve performance on queries filtering by fetch_job_id.
CREATE INDEX IF NOT EXISTS idx_content_items_fetch_job_id ON public.content_items(fetch_job_id); 