-- 🔍 检查Auto Digest设置是否保存成功

-- 1. 检查字段是否存在
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'auto_digest%'
ORDER BY column_name;

-- 2. 查看所有用户的Auto Digest设置
SELECT 
    id,
    email,
    auto_digest_enabled,
    auto_digest_time,
    auto_digest_timezone,
    last_auto_digest_run,
    created_at
FROM users 
ORDER BY created_at DESC;

-- 3. 只查看启用了Auto Digest的用户
SELECT 
    id,
    email,
    auto_digest_enabled,
    auto_digest_time,
    auto_digest_timezone,
    last_auto_digest_run
FROM users 
WHERE auto_digest_enabled = true;

-- 4. 检查当前时间和用户设置的时间（用于调试调度器）
SELECT 
    NOW() as current_utc_time,
    EXTRACT(HOUR FROM NOW()) as current_hour,
    EXTRACT(MINUTE FROM NOW()) as current_minute,
    id,
    email,
    auto_digest_time,
    EXTRACT(HOUR FROM auto_digest_time) as setting_hour,
    EXTRACT(MINUTE FROM auto_digest_time) as setting_minute
FROM users 
WHERE auto_digest_enabled = true;

-- 5. 模拟调度器查询（查找当前时间应该执行的用户）
WITH current_time AS (
    SELECT 
        EXTRACT(HOUR FROM NOW()) as hour,
        EXTRACT(MINUTE FROM NOW()) as minute
)
SELECT 
    u.id,
    u.email,
    u.auto_digest_time,
    u.last_auto_digest_run,
    CASE 
        WHEN u.last_auto_digest_run::date = CURRENT_DATE THEN '今天已执行'
        ELSE '今天未执行'
    END as today_status
FROM users u, current_time ct
WHERE u.auto_digest_enabled = true
AND EXTRACT(HOUR FROM u.auto_digest_time) = ct.hour
AND ABS(EXTRACT(MINUTE FROM u.auto_digest_time) - ct.minute) <= 2; 