UPDATE processing_tasks 
SET status = 'completed', 
    completed_at = NOW() 
WHERE id = 56 AND status = 'running';

SELECT id, status, completed_at FROM processing_tasks WHERE id = 56; 