# ✅ Gmail 认证测试清单

完成 Gmail 认证配置后，请按照此清单验证设置是否正确。

## 🚀 快速测试步骤

### 1. 环境变量检查
确保您的 `.env` 文件包含：
```bash
# 检查这些变量是否已设置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. 启动应用
```bash
npm run dev
```

### 3. 访问登录页面
- 打开 `http://localhost:5173/flowsense/login`
- 您应该看到：
  - ✅ 邮箱密码登录表单
  - ✅ "Continue with Google" 按钮（带 Google 图标）

### 4. 测试 Google 登录
1. 点击 "Continue with Google" 按钮
2. 应该发生：
   - ✅ 页面跳转到 Google 登录页面
   - ✅ 显示您的应用名称（FlowSense）
   - ✅ 要求授权访问基本信息

3. 完成 Google 授权后：
   - ✅ 自动跳转回 FlowSense 应用
   - ✅ 显示登录成功提示
   - ✅ 看到用户头像和姓名（来自 Google）
   - ✅ 能够正常使用应用功能

## 🔍 详细验证清单

### 浏览器控制台检查
打开浏览器开发者工具（F12），在 Console 面板中应该看到：

✅ **成功的日志信息**：
```
🔐 开始 Google 登录...
✅ Google 登录请求成功，等待重定向...
🔄 处理 OAuth 回调...
✅ OAuth 登录成功: your-email@gmail.com
🔄 认证状态变化: SIGNED_IN your-email@gmail.com
✅ 用户已登录，获取完整用户信息
```

❌ **如果看到错误信息**：
- `redirect_uri_mismatch` → 检查 Google Cloud Console 重定向 URI 配置
- `invalid_client` → 检查 Client ID 和 Secret 配置
- `Invalid Origin` → 检查 JavaScript origins 配置

### 网络请求检查
在 Network 面板中应该看到：
- ✅ 对 Google OAuth 的请求（`accounts.google.com`）
- ✅ 对 Supabase 的认证请求（`supabase.co`）
- ✅ 最终重定向到 `/auth/callback`

### 用户数据验证
登录成功后，在右上角用户菜单中应该看到：
- ✅ Google 头像正确显示
- ✅ 真实姓名（不是邮箱前缀）
- ✅ 正确的邮箱地址

## 🛠️ 常见问题快速修复

### 问题：Google 登录按钮不显示
**可能原因**：环境变量未正确设置

**快速检查**：
```bash
# 在项目根目录运行
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

**修复**：确保 `.env` 文件在项目根目录，重启开发服务器

### 问题：点击 Google 登录没有反应
**可能原因**：Supabase 配置问题

**快速检查**：
1. 访问 Supabase Dashboard
2. 检查 Authentication > Providers > Google 是否已启用
3. 确认 Client ID 和 Secret 正确填写

### 问题：登录后立即退出
**可能原因**：URL 配置不匹配

**快速检查**：
1. 确认 Supabase Auth 设置中的 Site URL 是 `http://localhost:5173/flowsense`
2. 确认 Google Cloud Console 中的重定向 URI 是 `http://localhost:5173/flowsense/auth/callback`

## 🎯 高级测试

### 1. 数据库验证
登录成功后，检查 Supabase Dashboard 中的 `users` 表：
- ✅ 新记录包含正确的 `google_id`
- ✅ `avatar_url` 字段包含 Google 头像链接
- ✅ `name` 字段是真实姓名，不是邮箱

### 2. 会话持久性测试
1. 登录后刷新页面
2. 关闭浏览器重新打开
3. 应该保持登录状态

### 3. 登出测试
1. 点击用户菜单中的 "Logout"
2. 应该正确跳转到登录页面
3. 再次访问任何受保护页面应该跳转到登录

## 📱 移动端测试

如果需要测试移动端：
1. 使用 `npm run dev -- --host` 启动服务器
2. 在 Google Cloud Console 中添加您的本地 IP 地址
3. 在移动设备上访问 `http://您的IP:5173/flowsense`

## ✅ 测试完成确认

当您能够：
- [x] 看到 Google 登录按钮
- [x] 成功跳转到 Google 授权页面  
- [x] 完成授权并自动返回应用
- [x] 看到正确的用户信息和头像
- [x] 正常使用应用所有功能
- [x] 成功登出和重新登录

**恭喜！您的 Gmail 认证设置已完成！** 🎉

## 📞 仍然有问题？

如果测试过程中遇到问题：

1. **检查所有配置步骤**：对照 `GOOGLE_AUTH_SETUP.md` 确认每个步骤
2. **查看浏览器控制台**：错误信息通常很明确
3. **检查 Supabase 日志**：在 Supabase Dashboard 中查看 Auth 日志
4. **清除浏览器缓存**：有时缓存会导致问题

**记住**：大多数问题都是配置错误，仔细检查 URL、Client ID 和 Secret 通常能解决问题。 