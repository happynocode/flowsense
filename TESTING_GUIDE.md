# 订阅系统测试指南

## 📋 测试文档概览

本项目包含完整的订阅系统测试套件，适用于不同的测试需求：

| 文档 | 用途 | 适用人员 | 时间 |
|------|------|----------|------|
| `SUBSCRIPTION_TESTING_CHECKLIST.md` | 完整端到端测试清单 | QA工程师、开发团队 | 15-20分钟 |
| `QUICK_TEST_CHECKLIST.md` | 快速验证核心功能 | 开发者日常测试 | 5-7分钟 |
| `test-subscription.js` | 自动化测试脚本 | DevOps、CI/CD | 2-3分钟 |

## 🚀 快速开始

### 1. 日常开发测试 (推荐)
```bash
# 打开快速测试清单
open QUICK_TEST_CHECKLIST.md

# 按照清单逐步测试
# 大约需要 5-7 分钟
```

### 2. 完整功能测试
```bash
# 打开详细测试清单  
open SUBSCRIPTION_TESTING_CHECKLIST.md

# 适用于：
# - 发布前的完整验证
# - 新团队成员的学习
# - 问题排查时的详细检查
```

### 3. 自动化测试 (开发中)
```bash
# 运行自动化测试脚本
node test-subscription.js [用户ID]

# 例如:
node test-subscription.js 6238d3f0-978c-4a57-8dfb-a73132c2763f
```

## 🔧 测试环境设置

### 必备工具
1. **开发服务器**: `npm run dev`
2. **Stripe 测试账户**: 有效的测试API密钥
3. **Supabase 项目**: 已部署Edge Functions

### 测试数据
```bash
# Stripe 测试卡号
卡号: 4242 4242 4242 4242
CVV: 任意3位数字  
过期日期: 任意未来日期

# 测试价格ID
Starter: price_1RYI6RJ190Ki7I11RybFy23j
Premium: price_1RYI6kJ190Ki7I11K8bmWjJn
```

## 📊 测试流程建议

### 开发阶段
- **每日**: 使用 `QUICK_TEST_CHECKLIST.md`
- **功能完成**: 使用 `SUBSCRIPTION_TESTING_CHECKLIST.md`

### 发布前
- **完整测试**: 运行所有测试清单
- **多环境**: 在staging和production环境重复测试
- **回归测试**: 验证之前的bug修复

### 问题排查
1. **第一步**: 运行 `test-subscription.js` 快速诊断
2. **第二步**: 查看 `SUBSCRIPTION_TESTING_CHECKLIST.md` 详细步骤
3. **第三步**: 使用调试工具和脚本修复问题

## 🛠️ 调试工具

### 1. 浏览器调试页面
```bash
# 访问专用调试页面
http://localhost:5173/debug-subscription
```

### 2. 权限修复脚本
```javascript
// 在浏览器控制台运行
// (脚本内容见各测试文档)
```

### 3. 日志查看
- **前端日志**: 浏览器控制台 (F12)
- **后端日志**: Supabase Functions Dashboard
- **Stripe日志**: Stripe Dashboard Events

## 📝 测试结果记录

### 推荐做法
1. **测试前**: 记录环境信息和测试目标
2. **测试中**: 及时记录异常和错误日志
3. **测试后**: 总结问题和解决方案

### 模板示例
```markdown
**测试日期**: 2024-01-15
**测试人员**: 张三
**测试环境**: 本地开发 + Stripe测试模式
**测试目标**: 验证订阅流程修复

**测试结果**:
- [x] 订阅页面加载正常
- [x] Checkout创建成功  
- [x] 支付处理正常
- [x] Webhook事件成功
- [x] 用户权限更新
- [x] 前端状态同步

**发现问题**: 无
**总耗时**: 6分钟
```

## 🚨 常见问题解决

### 环境问题
- **dev server 未启动**: `npm run dev`
- **环境变量缺失**: 检查 `.env.local` 和 Supabase secrets

### Stripe问题  
- **Price ID 错误**: 使用正确的测试价格ID
- **Webhook 401**: 重新设置 `STRIPE_WEBHOOK_SECRET`

### 权限问题
- **用户权限未更新**: 运行权限修复脚本
- **数据库权限错误**: 检查 RLS 策略

### 网络问题
- **Edge Function 超时**: 检查网络连接和函数日志
- **数据库连接失败**: 验证 Supabase 项目状态

## 📚 相关资源

### 官方文档
- [Stripe Testing](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### 项目文档
- `supabase_stripe_setup.md` - 初始设置指南
- `README_NEXT_STEPS.md` - 下一步开发计划

### Dashboard链接
- [Supabase Dashboard](https://supabase.com/dashboard/project/ryncyvnezqwqqtfsweti)
- [Stripe Dashboard](https://dashboard.stripe.com/test)

---

## 💡 最佳实践

1. **测试频率**: 每次代码变更后都应运行快速测试
2. **文档更新**: 测试流程变更时及时更新文档
3. **自动化**: 逐步增加自动化测试覆盖率
4. **团队协作**: 新成员应先熟悉完整测试流程
5. **问题追踪**: 建立测试问题的记录和解决流程

通过系统化的测试流程，确保订阅系统的稳定性和可靠性！ 