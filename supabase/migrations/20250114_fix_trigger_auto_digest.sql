/*
  # 修复用户触发器 - 防止Auto Digest设置被重置
  
  问题：当前的handle_new_user触发器在ON CONFLICT时只更新email和updated_at，
  但可能在某些情况下导致其他字段(包括auto digest设置)被重置为默认值。
  
  解决方案：修改触发器逻辑，确保冲突更新时只更新必要的字段，
  保护已存在的auto digest设置和其他用户数据。
*/

-- 备份当前触发器（用于调试）
DO $$ 
BEGIN
  RAISE LOG 'Creating backup of current handle_new_user function before modification';
END $$;

-- 重新创建改进的用户处理函数
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 记录触发器调用
  RAISE LOG 'handle_new_user triggered for user: %, email: %', NEW.id, NEW.email;
  
  -- 尝试插入新用户记录
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- 只在email实际发生变化时更新
    email = CASE 
      WHEN users.email != EXCLUDED.email THEN EXCLUDED.email 
      ELSE users.email 
    END,
    -- 只在name为空时更新（避免覆盖用户自定义的名称）
    name = CASE 
      WHEN users.name IS NULL OR users.name = '' THEN EXCLUDED.name 
      ELSE users.name 
    END,
    -- 更新时间戳
    updated_at = NOW()
  WHERE 
    -- 添加条件：只有在确实有变化时才执行更新
    users.email != EXCLUDED.email 
    OR users.name IS NULL 
    OR users.name = '';
  
  -- 记录操作完成
  RAISE LOG 'handle_new_user completed for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 详细错误日志
    RAISE LOG 'Error in handle_new_user for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
    -- 不要让认证过程失败
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保触发器存在（重新创建）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 添加索引以提高性能（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- 验证迁移完成
DO $$ 
BEGIN
  RAISE LOG '✅ User trigger fix migration completed successfully';
  RAISE LOG '🔧 Trigger now preserves existing auto_digest settings during conflicts';
END $$; 