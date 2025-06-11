create or replace function get_and_lock_pending_items(batch_size int)
returns table(id int, title text) as $$
begin
    return query
    with items_to_update as (
        select ci.id
        from content_items ci
        where ci.is_processed = false
        limit batch_size
        for update skip locked
    )
    update content_items
    set is_processed = true, updated_at = now()
    where content_items.id in (select items_to_update.id from items_to_update)
    returning content_items.id, content_items.title;
end;
$$ language plpgsql; 