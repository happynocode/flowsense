# 📅 自动每日Digest功能实现

## 🎯 功能概述

为项目添加了自动每日digest功能，允许用户设置每天定时自动运行"Process Today"来生成digest。

## ✨ 新增功能

### 1. 前端UI组件
- **AutoDigestSettings组件** (`src/components/sources/AutoDigestSettings.tsx`)
  - 开启/关闭自动digest的开关
  - 时间选择器设置每日执行时间
  - 立即测试按钮验证功能
  - 保存设置按钮

### 2. 数据库架构扩展
- **新增用户表字段** (`supabase/migrations/20250609040000_add_scheduled_digest.sql`)
  - `auto_digest_enabled`: 是否启用自动digest
  - `auto_digest_time`: 每日执行时间
  - `auto_digest_timezone`: 时区设置
  - `last_auto_digest_run`: 上次执行时间

### 3. API服务扩展
- **userApi** (`src/services/api.ts`)
  - `getAutoDigestSettings()`: 获取用户设置
  - `updateAutoDigestSettings()`: 更新用户设置
  - `triggerAutoDigest()`: 手动触发测试

### 4. 后端调度器
- **auto-digest-scheduler** (`supabase/functions/auto-digest-scheduler/index.ts`)
  - 定时检查需要执行digest的用户
  - 调用现有的processing API
  - 防重复执行机制

### 5. UI组件依赖
- **Switch组件** (`src/components/ui/switch.tsx`)
  - 基于Radix UI的切换开关组件

## 🛠️ 技术实现

### 架构设计
- 复用现有的异步任务系统
- 基于"Process Today"逻辑
- UTC时间统一处理
- 5分钟时间窗口确保调度灵活性

### 安全特性
- Row Level Security (RLS) 数据保护
- 用户只能管理自己的设置
- 防止同一天重复执行

## 📋 如何测试

### 1. 快速测试步骤

1. **启动开发环境**
   ```bash
   npm run dev
   ```

2. **运行数据库迁移**
   ```bash
   npx supabase migration up
   ```
   或手动执行SQL (见 `AUTO_DIGEST_SETUP.md`)

3. **测试UI功能**
   - 访问 `/sources` 页面
   - 找到 "Auto Daily Digest" 卡片
   - 开启开关，设置时间，保存设置
   - 点击"Test Now"按钮测试

4. **验证结果**
   - 观察processing进度
   - 检查 `/digests` 页面是否生成新digest

### 2. 使用测试工具

打开 `test-auto-digest.html` 获得：
- 数据库迁移SQL
- 手动设置用户配置
- 测试调度器函数
- 当前时间信息

## 🚀 部署说明

### 1. 部署Edge Function
```bash
npx supabase functions deploy auto-digest-scheduler
```

### 2. 设置定时任务
在生产环境中设置cron job每分钟调用scheduler：
```bash
# 每分钟执行
curl -X POST "https://your-supabase-url.supabase.co/functions/v1/auto-digest-scheduler" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📁 文件清单

### 新增文件
```
src/components/sources/AutoDigestSettings.tsx
src/components/ui/switch.tsx
supabase/migrations/20250609040000_add_scheduled_digest.sql
supabase/functions/auto-digest-scheduler/index.ts
test-auto-digest.html
AUTO_DIGEST_SETUP.md
FEATURE_AUTO_DIGEST.md
```

### 修改文件
```
src/types/index.ts - 添加User接口字段
src/services/api.ts - 添加userApi
src/pages/Sources.tsx - 集成AutoDigestSettings组件
```

## 🔧 故障排除

### 常见问题
1. **数据库连接问题**: 重启Supabase服务
2. **UI组件错误**: 检查Switch组件导入
3. **设置保存失败**: 验证用户认证状态
4. **调度器不工作**: 检查Edge Function部署和cron设置

### 调试工具
- 浏览器开发者工具
- Supabase Dashboard
- Edge Function日志
- 测试页面 (`test-auto-digest.html`)

## 🎨 UI特点

- 现代化的渐变设计
- 直观的开关和时间选择器
- 实时状态反馈
- 一键测试功能
- 清晰的帮助信息

## 🔮 未来增强

1. **时区支持**: 用户可选择自己的时区
2. **邮件通知**: Digest生成完成后发送通知
3. **灵活频率**: 支持每周、每月等频率
4. **批量管理**: 管理员批量管理用户设置
5. **高级调度**: 支持更复杂的时间规则

## 📊 性能考虑

- 索引优化查询性能
- 时间窗口避免精确时间匹配
- 异步处理防止阻塞
- 防重复机制节省资源

这个功能完全集成到现有系统中，提供了完整的用户体验和强大的后端支持。 