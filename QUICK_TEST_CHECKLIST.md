# 订阅流程快速测试清单

## 🚀 测试前准备 (2分钟)

```bash
# 1. 启动开发环境
cd digest-flow-daily && npm run dev

# 2. 确认测试数据
测试卡号: 4242 4242 4242 4242
CVV: 123
日期: 12/26
```

## ✅ 核心流程测试 (5分钟)

### 1. 订阅页面 → ✅/❌
- [ ] 访问 `http://localhost:5173/subscription`
- [ ] 点击 "开始7天免费试用"
- [ ] 控制台无错误

### 2. Checkout 创建 → ✅/❌
- [ ] 成功跳转到 Stripe 页面
- [ ] 显示正确金额和试用信息
- [ ] **检查**: Stripe Dashboard Events 有新的 checkout.session.created (200)

### 3. 支付完成 → ✅/❌
- [ ] 输入测试卡信息并提交
- [ ] 支付成功（无错误提示）
- [ ] **检查**: Stripe Dashboard Events 显示:
  - checkout.session.completed (200)
  - customer.subscription.created (200)
  - invoice.payment_succeeded (200)

### 4. Webhook 处理 → ✅/❌
- [ ] **检查**: Stripe Webhooks 页面所有事件状态为 200
- [ ] **检查**: Supabase Functions 日志显示成功处理
  ```
  Successfully updated user subscription
  Successfully updated user to premium tier
  ```

### 5. 数据库验证 → ✅/❌
```sql
-- 在 Supabase SQL 编辑器中运行
SELECT subscription_tier, max_sources FROM users WHERE id = '[用户ID]';
-- 预期: subscription_tier = 'premium', max_sources = 20

SELECT status, stripe_subscription_id FROM subscriptions WHERE user_id = '[用户ID]' ORDER BY created_at DESC LIMIT 1;
-- 预期: status = 'active', stripe_subscription_id 不为空
```

### 6. 前端验证 → ✅/❌
- [ ] 刷新页面，用户权限显示为 premium
- [ ] 可以添加超过3个信息源
- [ ] 订阅页面显示"已订阅"状态

---

## 🚨 常见失败点快速修复

### 如果支付后权限还是 free:
```javascript
// 浏览器控制台运行:
(async () => {
  const response = await fetch('/api/auth/user');
  const { user } = await response.json();
  
  await fetch('/api/subscription/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id })
  });
  
  console.log('✅ 权限同步完成');
  window.location.reload();
})();
```

### 如果 Webhook 401 错误:
```bash
# 重新设置 webhook secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 📋 测试记录

**日期**: _____ | **测试人**: _____ | **结果**: PASS/FAIL

| 步骤 | 状态 | 备注 |
|------|------|------|
| 订阅页面 | ✅/❌ |  |
| Checkout | ✅/❌ |  |
| 支付 | ✅/❌ |  |
| Webhook | ✅/❌ |  |
| 数据库 | ✅/❌ |  |
| 前端 | ✅/❌ |  |

**用户ID**: _______________
**订阅ID**: _______________ 