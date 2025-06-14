-- Fix the get_and_lock_pending_items function
-- The original function incorrectly marked items as processed immediately
-- This new version only locks items for processing without changing their status

CREATE OR REPLACE FUNCTION get_and_lock_pending_items(batch_size int)
RETURNS TABLE(id int, title text) AS $$
DECLARE
    locked_item_ids INT[];
BEGIN
    -- Step 1: Select and lock the item IDs, storing them in an array
    SELECT ARRAY_AGG(sub.id)
    INTO locked_item_ids
    FROM (
        SELECT ci.id
        FROM content_items ci
        WHERE ci.is_processed = false
        ORDER BY ci.created_at
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    ) AS sub;

    -- If no items are found, exit early
    IF array_length(locked_item_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Step 2: Return the locked item details WITHOUT marking them as processed
    -- The process-content function will mark them as processed after successful processing
    RETURN QUERY
    SELECT
        ci.id,
        ci.title
    FROM content_items AS ci
    WHERE ci.id = ANY(locked_item_ids);
END;
$$ LANGUAGE plpgsql; 