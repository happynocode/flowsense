# 🕒 设置Auto Digest调度器

## 问题诊断
✅ Edge Function已部署: `auto-digest-scheduler`
✅ 前端设置已保存: `auto_digest_enabled = true`
❌ **调度器没有被触发**: 缺少自动调用机制

## 🚀 解决方案

### 方法1: GitHub Actions (推荐)
创建GitHub Actions工作流来定期调用Edge Function。

### 方法2: 外部Cron服务
使用cron-job.org等服务定期调用。

### 方法3: Supabase Database Webhooks
使用pg_cron扩展（如果可用）。

---

## 🔧 方法1: GitHub Actions设置

### 步骤1: 创建GitHub Actions工作流

在你的仓库中创建 `.github/workflows/auto-digest.yml`:

```yaml
name: Auto Digest Scheduler

on:
  schedule:
    # 每5分钟运行一次
    - cron: '*/5 * * * *'
  workflow_dispatch: # 允许手动触发

jobs:
  trigger-auto-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Call Auto Digest Scheduler
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"source": "github-actions"}' \
            https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/auto-digest-scheduler
```

### 步骤2: 设置GitHub Secrets

在GitHub仓库设置中添加:
- `SUPABASE_SERVICE_ROLE_KEY`: 你的Service Role Key

---

## 🌐 方法2: 使用cron-job.org

### 步骤1: 注册并创建任务

1. 访问 https://cron-job.org
2. 注册账户
3. 创建新的Cron Job:
   - **URL**: `https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/auto-digest-scheduler`
   - **Schedule**: `*/5 * * * *` (每5分钟)
   - **Method**: POST
   - **Headers**: 
     ```
     Authorization: Bearer [你的Service Role Key]
     Content-Type: application/json
     ```
   - **Body**: 
     ```json
     {"source": "cron-job"}
     ```

---

## 🧪 测试调度器

### 手动测试Edge Function

```bash
curl -X POST \
  -H "Authorization: Bearer [Service-Role-Key]" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/auto-digest-scheduler
```

预期响应:
```json
{
  "success": true,
  "message": "Auto digest scheduler executed",
  "eligible_users": 1,
  "processed_users": 1
}
```

### 检查调度器日志

在Supabase Dashboard → Functions → auto-digest-scheduler → Logs

---

## 📊 监控和调试

### 检查用户是否符合条件

```sql
-- 查询当前时间应该触发的用户
WITH current_time AS (
    SELECT 
        EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC') as hour,
        EXTRACT(MINUTE FROM NOW() AT TIME ZONE 'UTC') as minute
)
SELECT 
    u.id,
    u.email,
    u.auto_digest_time,
    EXTRACT(HOUR FROM u.auto_digest_time) as setting_hour,
    EXTRACT(MINUTE FROM u.auto_digest_time) as setting_minute,
    u.last_auto_digest_run,
    CASE 
        WHEN u.last_auto_digest_run::date = CURRENT_DATE THEN '今天已运行'
        ELSE '今天未运行'
    END as status
FROM users u, current_time ct
WHERE u.auto_digest_enabled = true
AND EXTRACT(HOUR FROM u.auto_digest_time) = ct.hour
AND ABS(EXTRACT(MINUTE FROM u.auto_digest_time) - ct.minute) <= 2;
```

### 查看Edge Function日志

```sql
-- 在Supabase Dashboard中查看函数调用日志
-- Functions → auto-digest-scheduler → Logs
```

---

## 🎯 完整流程验证

1. **设置调度** (选择上述方法之一)
2. **等待触发时间** 或手动测试
3. **检查日志**:
   - Supabase Functions日志
   - GitHub Actions日志 (如果使用)
4. **验证结果**:
   - 检查 `last_auto_digest_run` 是否更新
   - 检查是否生成了新的digest

---

## ⚡ 快速启动 (推荐)

### 立即测试
```bash
# 替换 [YOUR-SERVICE-KEY] 为实际的Service Role Key
curl -X POST \
  -H "Authorization: Bearer [YOUR-SERVICE-KEY]" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "force": true}' \
  https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/auto-digest-scheduler
```

### 设置cron-job.org (5分钟内完成)
1. 注册 cron-job.org
2. 创建任务，每5分钟调用一次
3. 立即看到效果

这样你的auto digest就会真正自动运行了！ 