# 后端迁移与重构：待办事项清单

本文档旨在概述将后端逻辑从前端（`api.ts`）和旧版Flask应用迁移至Supabase Edge Functions的详细步骤。

---

## 阶段一：后端逻辑迁移至Edge Functions (2-3天)

### 1.1: 环境设置 ✅
- [x] 安装 Supabase CLI: `npm install -g supabase` (使用 npx supabase)
- [x] 登录 Supabase CLI: `supabase login`
- [x] 关联项目: `supabase link --project-ref <你的项目ID>`
- [x] 创建新的 Edge Functions:
  - `supabase functions new process-all-sources`
  - `supabase functions new clear-content`
  - `supabase functions new validate-source`
- [x] 在 `.env.local` 文件中设置本地环境变量:
  ```
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
  DEEPSEEK_API_KEY=...
  ```

### 1.2: 实现 `process-all-sources` Edge Function ✅
- [x] **创建主函数 (`supabase/functions/process-all-sources/index.ts`)**:
    - [x] 为 `OPTIONS` 请求添加CORS（跨域资源共享）处理。
    - [x] 使用请求头（request headers）实现用户身份验证检查。
    - [x] 获取已验证用户的有效内容源（content sources）。
    - [x] 遍历内容源，并为每个源调用一个处理模块。
    - [x] 收集处理结果（成功、跳过、错误）。
    - [x] 如果有新内容被总结，则调用摘要（digest）生成逻辑。
    - [x] 返回一个结构化的JSON响应。
- [x] **迁移RSS解析与内容抓取逻辑**:
    - [x] 为RSS解析创建一个辅助模块 (集成在主函数中)。
    - [x] 将 `api.ts` 中用于获取和解析RSS源的逻辑迁移过来。
    - [x] 实现mock内容生成逻辑用于测试。
- [x] **迁移AI总结逻辑**:
    - [x] 为AI调用创建一个专用模块 (集成在主函数中)。
    - [x] 将 `api.ts` 中的 `generateSimpleSummary` 逻辑迁移过来。
    - [x] 从环境变量中安全地获取 `DEEPSEEK_API_KEY`。
    - [x] 为API调用实现错误处理（如速率限制、超时）。
- [x] **迁移Digest生成逻辑**:
    - [x] 为Digest生成创建一个模块 (集成在主函数中)。
    - [x] 将 `api.ts` 中的 `generateDigestFromSummaries` logic 迁移过来。
    - [x] 确保它能正确地创建 `digests` 和 `digest_items`。

### 1.3: 实现 `clear-content` Edge Function ✅
- [x] **创建 `supabase/functions/clear-content/index.ts`**:
    - [x] 添加CORS和用户身份验证。
    - [x] 迁移 `api.ts` 中的 `clearScrapedContent` 逻辑。
    - [x] 删除该用户的所有 `digests`、`digest_items` 和 `summaries`。
    - [x] 重置所有 `content_sources` 的 `last_scraped_at` 字段。

### 1.4: 实现 `validate-source` Edge Function ✅
- [x] **创建 `supabase/functions/validate-source/index.ts`**:
    - [x] 添加CORS和用户身份验证。
    - [x] 迁移 `api.ts` 中的 `validateSourceUrl` 逻辑并增强功能。
    - [x] 实现URL格式验证、RSS模式检查和HTTP HEAD请求验证。
    - [x] 返回一个包含验证状态的详细JSON响应。

---

## 阶段二：前端重构 (1-2天)

### 2.1: 更新API服务层
- [ ] **重构 `src/services/api.ts`**:
    - [ ] 移除庞大的 `processAllSources` 实现。
    - [ ] 将其替换为使用 `supabase.functions.invoke()` 对 `process-all-sources` Edge Function 的简单调用。
    - [ ] 移除 `clearScrapedContent` 的实现，并替换为对 `clear-content` Edge Function 的调用。
    - [ ] 移除 `checkIfRSSFeedLocal`, `processRSSSource`, `generateRecentArticles`, `fetchFullArticleContent`, `generateSimpleSummary`, `createSimpleSummary`, 和 `generateDigestFromSummaries`。文件应该会变得小很多。

### 2.2: 更新前端组件
- [ ] **更新 `src/pages/Sources.tsx`**:
    - [ ] 确保 `handleProcessAllSources` 能正确调用新的 `sourcesApi.processAllSources`。
    - [ ] 验证加载状态 (`globalProcessing`) 和结果显示 (`processResults`) 仍然能与Edge Function的响应正常工作。
    - [ ] 确保 `handleClearScrapedContent` 能调用新的 `sourcesApi.clearScrapedContent`。
- [ ] **更新内容源表单**:
    - [ ] 更新"添加源"表单中的源验证逻辑，使其调用 `validate-source` Edge Function。

### 2.3: 本地开发与测试
- [ ] 在本地运行Supabase服务: `supabase start`
- [ ] 为测试部署Functions: `supabase functions deploy process-all-sources` (以及其他)
- [ ] 运行前端开发服务器并测试端到端流程。
- [ ] 检查Function日志以排查错误: `supabase functions logs --project-ref <你的项目ID>`

---

## 阶段三：清理与最终化 (1天)

### 3.1: 移除Flask后端
- [ ] **删除Flask相关的文件和目录**:
    - [ ] `start_backend.py`
    - [ ] `src/main.py`
    - [ ] `src/routes/`
    - [ ] `src/models/` (Python模型)
    - [ ] `src/services/` (Python服务，如 `scraper.py`, `summarizer.py`)
    - [ ] `instance/`
    - [ ] `__pycache__/` 目录
    - [ ] `requirements.txt`
    - [ ] `DEEPSEEK_SETUP.md` (如果不再需要)

### 3.2: 清理依赖项
- [ ] **审查 `package.json`**:
    - [ ] 移除那些仅用于在前端实现后端逻辑的依赖项。
- [ ] **更新根目录的 `README.md`**:
    - [ ] 移除与运行Flask后端相关的说明。
    - [ ] 添加运行/部署Supabase Edge Functions的说明。

### 3.3: 最终部署
- [ ] 将所有Functions部署到生产环境: `supabase functions deploy --project-ref <你的项目ID>`
- [ ] 确保在Supabase仪表盘中设置了生产环境变量。
- [ ] 在部署的网站上执行最后一轮端到端测试。 