# 🚀 Google 认证设置指南 - FlowSense

本指南将帮助您为 FlowSense 项目配置 Google OAuth 认证功能。

## 第一步：Google Cloud Console 设置

### 1. 访问 Google Cloud Console
- 打开 [Google Cloud Console](https://console.cloud.google.com/)
- 登录您的 Google 账号
- 创建新项目或选择现有项目

### 2. 启用 APIs
- 在左侧菜单中，点击 "APIs & Services" > "Library"
- 搜索并启用 "Google+ API" 或 "People API"

### 3. 配置 OAuth 同意屏幕
- 点击 "APIs & Services" > "OAuth consent screen"
- 选择 "External" 用户类型（除非您有 Google Workspace）
- 填写必要信息：
  - **应用名称**: `FlowSense`
  - **用户支持电子邮件**: 您的邮箱
  - **开发者联系信息**: 您的邮箱

### 4. 创建 OAuth 2.0 凭据
- 点击 "APIs & Services" > "Credentials"
- 点击 "Create Credentials" > "OAuth client ID"
- 选择 "Web application"
- 名称：`FlowSense Web Client`

### 5. 配置授权域名和重定向 URI

**⚠️ 重要：这些设置必须完全正确，否则 Google 登录将失败**

#### Authorized JavaScript origins（授权的 JavaScript 来源）
注意：不能包含路径，不能以 "/" 结尾

```
http://localhost:5173
https://您的域名.com
```

#### Authorized redirect URIs（授权的重定向 URI）
这些是完整的回调 URL：

```
http://localhost:5173/flowsense/auth/callback
https://happynocode.github.io/flowsense/auth/callback
```

### 6. 保存凭据
- 复制 `Client ID`（格式类似：xxxxx.apps.googleusercontent.com）
- 复制 `Client Secret`
- **重要**：请妥善保管这些凭据

## 第二步：Supabase Dashboard 配置

### 1. 登录 Supabase Dashboard
- 访问 [Supabase Dashboard](https://supabase.com/dashboard)
- 选择您的项目

### 2. 配置 Google Provider
- 点击 "Authentication" > "Providers"
- 找到 "Google" 并点击启用
- 填入从 Google Cloud Console 获取的：
  - **Client ID**: 您的 Google Client ID
  - **Client Secret**: 您的 Google Client Secret

### 3. 配置 URL 设置
- 点击 "Authentication" > "URL Configuration"
- **Site URL**: 
  - 开发环境：`http://localhost:5173/flowsense`
  - 生产环境：`https://happynocode.github.io/flowsense`
- **Redirect URLs**：
  ```
  http://localhost:5173/flowsense
  https://happynocode.github.io/flowsense
  ```

## 第三步：更新项目配置

### 1. 创建/更新 `.env` 文件
在项目根目录创建 `.env` 文件（如果不存在），并添加以下内容：

```env
# Supabase Configuration
VITE_SUPABASE_URL=您的_supabase_项目_url
VITE_SUPABASE_ANON_KEY=您的_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=您的_supabase_service_role_key

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=您的_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=您的_google_client_secret

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...您的_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_51...您的_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...您的_stripe_webhook_secret

# Gemini AI Configuration
GEMINI_API_KEY=您的_gemini_api_key

# Application Configuration
VITE_APP_URL=http://localhost:5173
```

### 2. 更新 `supabase/config.toml`
确保您的 `supabase/config.toml` 文件包含以下配置：

```toml
[auth]
enabled = true
site_url = "http://localhost:5173/flowsense"
additional_redirect_urls = ["http://localhost:5173/flowsense", "https://您的域名.com/flowsense"]

# Google OAuth Configuration
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

## 第四步：测试配置

### 1. 启动开发服务器
```bash
npm install
npm run dev
```

### 2. 测试登录流程
1. 访问 `http://localhost:5173/flowsense`
2. 点击登录按钮
3. 您应该看到：
   - 传统的邮箱密码登录表单
   - "Continue with Google" 按钮
4. 点击 "Continue with Google" 应该：
   - 跳转到 Google 登录页面
   - 完成授权后自动返回应用
   - 成功登录到 FlowSense

### 3. 验证功能
- 检查用户信息是否正确显示
- 确认 Google 头像和姓名是否正确
- 测试登出功能

## 🔧 常见问题排除

### "redirect_uri_mismatch" 错误
**原因**: Google Cloud Console 中的重定向 URI 配置不正确

**解决方案**:
1. 检查 Google Cloud Console 中的 "Authorized redirect URIs"
2. 确保包含：`http://localhost:5173/flowsense/auth/callback`
3. 如果是生产环境，确保包含：`https://您的域名.com/flowsense/auth/callback`

### "Invalid Origin" 错误
**原因**: JavaScript origins 配置不正确

**解决方案**:
1. 检查 "Authorized JavaScript origins" 字段
2. 确保域名不包含路径，不以 "/" 结尾
3. 本地开发使用：`http://localhost:5173`
4. 生产环境使用：`https://您的域名.com`

### "invalid_client" 错误
**原因**: Client ID 或 Client Secret 不正确

**解决方案**:
1. 检查 `.env` 文件中的 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
2. 确保在 Supabase Dashboard 中正确配置了相同的值
3. 重新启动开发服务器

### Google 登录按钮不显示
**原因**: 环境变量未正确配置

**解决方案**:
1. 检查 `.env` 文件是否存在于项目根目录
2. 确保所有必要的环境变量都已设置
3. 重新启动开发服务器（`npm run dev`）

### 登录后立即退出
**原因**: Supabase 配置问题

**解决方案**:
1. 检查 Supabase URL 配置是否正确
2. 确保 Google Provider 在 Supabase 中已启用
3. 检查 Site URL 和 Redirect URLs 配置

## 📝 生产环境部署注意事项

### 1. 域名配置
- 将所有 `localhost:5173` 替换为您的实际域名
- 确保使用 HTTPS（Google OAuth 在生产环境中要求 HTTPS）

### 2. 环境变量
- 在部署平台（如 Vercel、Netlify 等）中设置环境变量
- **绝对不要**将 `.env` 文件提交到 Git 仓库

### 3. Google Cloud Console
- 添加生产环境的域名到 Authorized JavaScript origins 和 Authorized redirect URIs
- 考虑创建单独的 Google Cloud 项目用于生产环境

## 🛡️ 安全提示

1. **保护敏感信息**：
   - 绝不在客户端代码中暴露 `GOOGLE_CLIENT_SECRET`
   - 使用环境变量管理所有敏感配置

2. **定期更新**：
   - 定期轮换 API 密钥
   - 监控 Google Cloud Console 中的使用情况

3. **访问控制**：
   - 在 Google Cloud Console 中设置适当的访问权限
   - 定期审查项目权限

## 📞 获取帮助

如果您在设置过程中遇到问题：

1. 检查浏览器控制台是否有错误信息
2. 查看 Supabase Dashboard 中的日志
3. 确认所有配置步骤都已正确完成

---

**注意**: 本指南基于当前的 Google Cloud Platform 和 Supabase 界面。如果界面有所变化，请参考官方文档进行相应调整。 