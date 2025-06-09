# 自动每日Digest功能

## 功能概述

这个功能允许用户设置每天定时自动运行"Process Today"来生成digest。用户可以：

1. 开启/关闭自动digest功能
2. 设置每天的执行时间
3. 测试功能是否正常工作

## 新增的功能组件

### 1. 数据库字段扩展

在 `users` 表中新增了以下字段：
- `auto_digest_enabled`: 是否启用自动digest (BOOLEAN)
- `auto_digest_time`: 每日执行时间 (TIME, 默认 '09:00:00')
- `auto_digest_timezone`: 时区 (TEXT, 默认 'UTC')
- `last_auto_digest_run`: 上次自动执行时间 (TIMESTAMPTZ)

### 2. 前端UI组件

- **AutoDigestSettings 组件**: 在 Sources 页面中显示的配置界面
  - 启用/禁用切换开关
  - 时间选择器
  - 立即测试按钮
  - 设置保存按钮

### 3. API扩展

在 `userApi` 中新增：
- `getAutoDigestSettings()`: 获取用户的自动digest设置
- `updateAutoDigestSettings()`: 更新用户的自动digest设置
- `triggerAutoDigest()`: 手动触发自动digest (用于测试)

### 4. 后端调度功能

- **auto-digest-scheduler Edge Function**: 定时检查并执行用户的自动digest任务

## 如何测试功能

### 1. 启动开发环境

```bash
# 启动前端开发服务器
npm run dev

# 启动Supabase (如果还没启动)
npx supabase start
```

### 2. 数据库迁移

```bash
# 运行迁移以添加新字段
npx supabase migration up
```

如果迁移失败，可以手动在数据库中执行以下SQL：

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auto_digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_digest_time TIME DEFAULT '09:00:00', 
ADD COLUMN IF NOT EXISTS auto_digest_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS last_auto_digest_run TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_auto_digest_enabled 
ON users(auto_digest_enabled) WHERE auto_digest_enabled = true;

CREATE INDEX IF NOT EXISTS idx_users_auto_digest_time 
ON users(auto_digest_time) WHERE auto_digest_enabled = true;
```

### 3. 测试步骤

1. **访问 Sources 页面**
   - 登录系统后访问 `/sources` 页面
   - 确保你有一些激活的content sources

2. **配置自动Digest**
   - 在页面中找到 "Auto Daily Digest" 卡片
   - 打开 "Enable Auto Digest" 开关
   - 设置一个时间（比如当前时间的几分钟后）
   - 点击 "Save Settings" 保存设置

3. **立即测试**
   - 点击 "Test Now" 按钮
   - 观察是否触发了processing流程
   - 检查是否有任务进度显示

4. **验证结果**
   - 处理完成后，前往 `/digests` 页面
   - 查看是否生成了新的digest

### 4. 部署Edge Function

```bash
# 部署auto-digest-scheduler函数
npx supabase functions deploy auto-digest-scheduler
```

### 5. 设置定时任务 (生产环境)

在生产环境中，你需要设置一个cron job或使用云服务的定时任务来每分钟调用auto-digest-scheduler函数：

```bash
# 每分钟执行一次
curl -X POST "https://your-supabase-url.supabase.co/functions/v1/auto-digest-scheduler" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 功能特点

### 安全特性
- 用户只能管理自己的自动digest设置
- 使用Row Level Security (RLS) 保护数据
- 防止同一天多次执行同一用户的digest

### 用户体验
- 直观的开关界面
- 立即测试功能验证设置
- 清晰的状态提示和错误信息
- 与现有的processing流程无缝集成

### 技术实现
- 基于现有的异步任务系统
- 复用 "Process Today" 的逻辑
- UTC时间统一处理，避免时区问题
- 5分钟时间窗口确保调度的灵活性

## 故障排除

### 常见问题

1. **数据库迁移失败**
   - 手动执行SQL语句添加字段
   - 检查Supabase服务是否正常运行

2. **设置保存失败**
   - 确保用户已登录
   - 检查网络连接和API响应

3. **测试功能无响应**
   - 确保有激活的content sources
   - 检查后端API服务状态

4. **自动调度不工作**
   - 检查Edge Function是否正确部署
   - 验证cron job设置
   - 查看函数日志

### 调试工具

- 浏览器开发者工具查看网络请求
- Supabase Dashboard查看数据库状态
- Edge Function日志查看执行状态

## 下一步增强

1. **时区支持**: 支持用户选择自己的时区
2. **通知系统**: Digest生成完成后发送邮件通知
3. **灵活调度**: 支持每周、每月等不同频率
4. **批量管理**: 管理员界面批量管理用户设置 