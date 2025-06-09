# 🚀 生产环境部署指南

## 当前状态

✅ **Edge Function已部署**: auto-digest-scheduler  
✅ **前端代码已更新**: 使用Simple版本确保兼容性  
⏳ **需要执行**: 数据库迁移  

## 🎯 立即执行步骤

### 1. 数据库迁移 (必须先执行)

**访问**: https://supabase.com/dashboard/project/ryncyvnezqwqqtfsweti/sql

**执行以下SQL**:
```sql
-- Add scheduled digest configuration columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auto_digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_digest_time TIME DEFAULT '09:00:00', 
ADD COLUMN IF NOT EXISTS auto_digest_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS last_auto_digest_run TIMESTAMPTZ;

-- Create index for efficient querying of users who have auto digest enabled
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_enabled 
ON users(auto_digest_enabled) WHERE auto_digest_enabled = true;

-- Create index for auto digest time to help with scheduling queries
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_time 
ON users(auto_digest_time) WHERE auto_digest_enabled = true;
```

### 2. 部署前端更新

你的前端构建已完成，将 `dist/` 目录部署到你的托管服务。

### 3. 验证功能

执行SQL后，访问你的应用 `/sources` 页面，应该看到：
- ✅ "Enable Auto Digest" 复选框
- ✅ 时间选择器 (总是可见)
- ✅ Debug状态信息
- ✅ 保存按钮和手动控制按钮

### 4. 测试流程

1. **勾选复选框** - Enable Auto Digest
2. **设置时间** - 选择一个时间
3. **点击保存** - 应该显示成功通知
4. **检查数据库** - 确认用户记录已更新

### 5. 测试API连接

使用 `test-production.html` 工具:
- 输入Service Role Key
- 测试调度器函数
- 验证返回结果

## 🔧 如果仍然看不到开关

### 选项A: 检查浏览器控制台
1. 打开F12开发者工具
2. 查看Console标签页的错误信息
3. 检查Network标签页的API调用

### 选项B: 强制刷新
1. 硬刷新页面 (Ctrl+F5)
2. 清除浏览器缓存
3. 确保部署了最新版本

### 选项C: 验证部署
确保你部署的是最新构建的版本 (包含AutoDigestSettingsSimple组件)

## 📊 数据库验证

执行SQL后，可以查询验证:
```sql
-- 检查字段是否已添加
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'auto_digest%';

-- 检查索引是否已创建
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%auto_digest%';
```

## 🚀 成功后的下一步

1. **配置Cron Job**: 设置每分钟调用调度器
2. **测试完整流程**: 用户设置 → 自动执行 → 生成digest
3. **监控日志**: 查看Edge Function执行日志

## 🆘 故障排除

**问题**: 仍然看不到开关  
**解决**: 确保执行了数据库迁移，并且部署了最新前端代码

**问题**: API调用失败  
**解决**: 检查Supabase连接，确认字段存在

**问题**: 保存失败  
**解决**: 验证用户认证状态和RLS权限

---

**关键**: 必须先执行数据库迁移，然后部署前端更新！ 