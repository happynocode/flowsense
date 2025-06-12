ALTER TABLE public.content_items
ADD COLUMN task_id BIGINT;

COMMENT ON COLUMN public.content_items.task_id IS 'Foreign key to the processing_tasks table, linking this content item to a specific digest generation task.'; 