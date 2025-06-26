# FlowSense GitHub Pages 部署指南

## 📋 部署前准备

### 1. 仓库名称修改
如果你的仓库名不是 `flowsense`，需要修改以下文件：

**vite.config.ts**
```typescript
base: '/你的仓库名/',
```

**src/App.tsx**
```typescript
<BrowserRouter basename="/你的仓库名">
```

### 2. 环境变量设置
在你的 GitHub 仓库中设置以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 添加以下 Repository secrets：
   - `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase 匿名密钥

### 3. 启用 GitHub Pages
1. 进入仓库 → Settings → Pages
2. Source 选择 "GitHub Actions"
3. 保存设置

## 🚀 自动部署

推送代码到 `main` 分支会自动触发部署：

```bash
git add .
git commit -m "Deploy FlowSense"
git push origin main
```

## 🔧 手动部署

也可以在 Actions 页面手动触发部署：
1. 进入仓库 → Actions
2. 选择 "Deploy to GitHub Pages" workflow
3. 点击 "Run workflow"

## 📊 部署状态

部署完成后，你的应用将在以下地址可用：
```
https://你的用户名.github.io/你的仓库名/
```

## ⚠️ 常见问题

### 404 错误
- 确保 GitHub Pages 已启用
- 检查仓库名是否正确配置在 `base` 路径中
- 确认 `404.html` 文件已正确创建（GitHub Actions 会自动处理）

### 路由问题
- 使用 `BrowserRouter` 需要正确的 `basename` 配置
- 刷新页面时的 404 错误由 `404.html` 文件解决

### 环境变量问题
- 确认所有必需的 Secrets 已正确设置
- 检查 Supabase 配置是否正确

## 🔄 更新部署

每次推送到 `main` 分支都会自动更新部署，无需手动操作。 