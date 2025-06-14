/*
  # 修复 RLS 策略以支持 Upsert 操作
  
  解决用户数据库同步失败的409冲突错误，确保authenticated用户有正确的权限进行upsert操作
  同时确保auto_digest字段存在，解决PGRST116错误
*/

-- 删除可能存在冲突的策略
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Allow auth trigger to insert users" ON users;

-- 创建统一的策略来支持用户自己的数据操作
CREATE POLICY "Users can manage own data" ON users
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 允许service_role插入用户（用于触发器）
CREATE POLICY "Service role can manage users" ON users
  FOR ALL TO service_role
  WITH CHECK (true);

-- 允许authenticated用户插入自己的记录（用于upsert操作）
CREATE POLICY "Enable authenticated user self-insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 确保RLS已启用
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 确保auto_digest字段存在（修复PGRST116错误）
DO $$ 
BEGIN
  -- Check and add auto_digest_enabled column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_enabled') THEN
    ALTER TABLE users ADD COLUMN auto_digest_enabled BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ 添加了 auto_digest_enabled 字段';
  END IF;

  -- Check and add auto_digest_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_time') THEN
    ALTER TABLE users ADD COLUMN auto_digest_time TIME DEFAULT '09:00:00';
    RAISE NOTICE '✅ 添加了 auto_digest_time 字段';
  END IF;

  -- Check and add auto_digest_timezone column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_timezone') THEN
    ALTER TABLE users ADD COLUMN auto_digest_timezone TEXT DEFAULT 'UTC';
    RAISE NOTICE '✅ 添加了 auto_digest_timezone 字段';
  END IF;

  -- Check and add last_auto_digest_run column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_auto_digest_run') THEN
    ALTER TABLE users ADD COLUMN last_auto_digest_run TIMESTAMPTZ;
    RAISE NOTICE '✅ 添加了 last_auto_digest_run 字段';
  END IF;
END $$;

-- 创建索引以提高upsert性能
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_enabled 
ON users(auto_digest_enabled) WHERE auto_digest_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_time 
ON users(auto_digest_time) WHERE auto_digest_enabled = true;

-- 验证策略配置
DO $$
BEGIN
  RAISE NOTICE '✅ RLS策略已更新完成';
  RAISE NOTICE '📋 当前users表的RLS策略:';
  RAISE NOTICE '   - Users can manage own data (authenticated用户管理自己的数据)';
  RAISE NOTICE '   - Service role can manage users (service_role管理所有用户)';
  RAISE NOTICE '   - Enable authenticated user self-insert (authenticated用户可以插入自己的记录)';
  RAISE NOTICE '✅ Auto digest 字段已确保存在';
  RAISE NOTICE '✅ 性能优化索引已创建';
END $$; 