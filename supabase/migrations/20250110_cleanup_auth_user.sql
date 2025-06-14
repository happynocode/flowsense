/*
  # 清理 Auth 用户记录
  
  针对 database reset 后的用户重新注册问题，安全删除 auth.users 中的指定用户记录
  使用前请确认用户邮箱地址
*/

-- 首先查看要删除的用户信息（确认操作对象）
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- 替换为实际的用户邮箱

-- 删除用户的所有相关认证数据
-- 1. 删除用户的身份验证记录
DELETE FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- 2. 删除用户的会话记录
DELETE FROM auth.sessions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- 3. 删除用户的刷新令牌
DELETE FROM auth.refresh_tokens 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- 4. 最后删除用户记录本身
DELETE FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';

-- 验证删除结果
SELECT 
  'User deleted successfully' as status,
  COUNT(*) as remaining_users_with_email
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE'; 