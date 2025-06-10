-- 修复用户权限脚本
-- 查找最近的用户（根据你的用户ID）

-- 1. 首先查看当前用户状态
SELECT 
    id,
    email,
    subscription_tier,
    max_sources,
    can_schedule_digest,
    can_process_weekly,
    created_at
FROM users 
WHERE subscription_tier = 'free' 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 查看订阅表中的活跃订阅
SELECT 
    user_id,
    stripe_subscription_id,
    status,
    plan_type,
    current_period_start,
    current_period_end,
    created_at
FROM subscriptions 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. 找到有活跃订阅但权限是 free 的用户
SELECT 
    u.id,
    u.email,
    u.subscription_tier,
    s.stripe_subscription_id,
    s.status as subscription_status,
    s.plan_type
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active' 
AND u.subscription_tier = 'free'
ORDER BY s.created_at DESC;

-- 4. 修复权限（将有活跃订阅的用户更新为premium）
UPDATE users 
SET 
    subscription_tier = 'premium',
    max_sources = 20,
    can_schedule_digest = true,
    can_process_weekly = true,
    updated_at = now()
WHERE id IN (
    SELECT u.id 
    FROM users u
    JOIN subscriptions s ON u.id = s.user_id
    WHERE s.status = 'active' 
    AND u.subscription_tier = 'free'
);

-- 5. 验证修复结果
SELECT 
    u.id,
    u.email,
    u.subscription_tier,
    u.max_sources,
    u.can_schedule_digest,
    u.can_process_weekly,
    s.stripe_subscription_id
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY u.updated_at DESC; 