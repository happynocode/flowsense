# Supabase 设置指南

## 步骤 1: 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project" 或 "Sign up"
3. 使用 GitHub 账号登录（推荐）或创建新账号
4. 登录后，点击 "New Project"
5. 选择组织（如果是第一次使用，会自动创建）
6. 填写项目信息：
   - **Name**: 例如 "daily-digest" 或任何你喜欢的名字
   - **Database Password**: 创建一个强密码（请记住这个密码）
   - **Region**: 选择离你最近的区域（例如 "Southeast Asia (Singapore)" 或 "Northeast Asia (Tokyo)"）
7. 点击 "Create new project"

## 步骤 2: 获取 API 凭据

项目创建完成后（通常需要 1-2 分钟）：

1. 在项目仪表板左侧菜单中，点击 **"Settings"**（设置图标）
2. 在 Settings 菜单中，点击 **"API"**
3. 你会看到以下信息：

### Project URL
```
https://your-project-id.supabase.co
```

### API Keys
- **anon public**: 这是你需要的 anon key
- **service_role**: 这是服务端密钥（暂时不需要）

## 步骤 3: 更新 .env 文件

将获取到的信息填入 `.env` 文件：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 步骤 4: 设置数据库

1. 在 Supabase 仪表板中，点击左侧的 **"SQL Editor"**
2. 点击 "New query"
3. 复制并粘贴 `supabase/migrations/20250607163248_twilight_dust.sql` 文件中的内容
4. 点击 "Run" 执行 SQL

## 步骤 5: 配置认证

1. 在左侧菜单点击 **"Authentication"**
2. 点击 **"Settings"** 标签
3. 向下滚动到 **"Auth Providers"** 部分
4. 找到 **"Google"** 并点击启用
5. 你需要：
   - Google Client ID
   - Google Client Secret

### 获取 Google OAuth 凭据：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 凭据
5. 设置授权重定向 URI：
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```

## 故障排除

如果遇到问题：

1. **项目创建失败**: 检查网络连接，稍后重试
2. **找不到 API 设置**: 确保项目已完全创建完成
3. **认证问题**: 检查 URL 和 Key 是否正确复制

## 快速测试

更新 `.env` 文件后，重启开发服务器：
```bash
npm run dev
```

如果配置正确，应用应该能正常加载而不会出现 Supabase 错误。