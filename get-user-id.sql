-- 🔍 获取你的用户ID
-- 在Supabase Dashboard的SQL编辑器中运行这个查询

-- 方法1: 通过邮箱查找
SELECT id, email, created_at, auto_digest_enabled 
FROM auth.users 
WHERE email = '你的邮箱@example.com';

-- 方法2: 查看最近创建的用户
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 方法3: 如果你的users表有email字段
SELECT id, email, auto_digest_enabled, auto_digest_time 
FROM users 
WHERE email = '你的邮箱@example.com';

-- 方法4: 查看所有用户（如果用户不多的话）
SELECT id, email, auto_digest_enabled 
FROM users 
ORDER BY created_at DESC; 