-- 修复Cron任务的Authorization Token问题
-- 问题：当前使用的是anon token，需要改为service_role token

-- 首先删除现有的错误任务
SELECT cron.unschedule('auto-digest-frequent-check');

-- 重新创建任务，使用正确的Service Role Key
SELECT cron.schedule(
    'auto-digest-frequent-check',  -- 任务名
    '*/5 * * * *',  -- 每5分钟执行
    $$ 
    SELECT 
      net.http_post(
        url := 'https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/auto-digest-scheduler',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bmN5dm5lenF3cXF0ZnN3ZXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY0MTQ2NywiZXhwIjoyMDQ5MjE3NDY3fQ.iQD_tJ5W29raxNaUE2MYeOD7YW1RBIfvfbKeLbhLI7o'
        ),
        body := jsonb_build_object('source', 'cron-fixed')
      ) as request_id;
    $$
);

-- 验证任务已创建
SELECT 
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job 
WHERE jobname = 'auto-digest-frequent-check';

-- 查看最近的执行记录（应该在5分钟内看到新的记录）
SELECT 
    j.jobname,
    j.schedule,
    jr.status,
    jr.return_message,
    jr.start_time,
    jr.end_time
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE j.jobname = 'auto-digest-frequent-check'
ORDER BY jr.start_time DESC
LIMIT 5; 