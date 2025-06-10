# 订阅系统端到端测试清单

## 概述

本文档详细记录了用户订阅流程的完整测试清单，包括前端、后端、数据库和第三方服务的检查点。

## 测试环境准备

### 1. 开发环境启动
```bash
cd digest-flow-daily
npm run dev
```

### 2. Supabase Edge Functions (可选)
```bash
npx supabase functions serve --env-file .env.local
```

### 3. 测试工具
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ryncyvnezqwqqtfsweti
- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **浏览器开发者工具**: F12 > Console

---

## 🔄 测试流程清单

### 步骤 1: 访问订阅页面
**URL**: `http://localhost:5173/subscription`

#### ✅ 前端检查
- [ ] 页面正常加载，无JS错误
- [ ] 显示两个订阅计划 (Starter $9.99, Premium $19.99)
- [ ] 用户登录状态正确显示
- [ ] 当前订阅状态显示（如果有）
- [ ] "开始7天免费试用"按钮可点击

#### 📝 前端日志检查
```javascript
// 浏览器控制台应该显示:
🔍 Fetching subscription for user: [user_id]
✅ Subscription found: [data] 
// 或者
ℹ️ No active subscription found
```

#### 🗄️ 后端检查
- [ ] Supabase 数据库连接正常
- [ ] 用户认证状态有效
- [ ] 用户表数据完整

---

### 步骤 2: 点击订阅计划
**操作**: 点击 "开始7天免费试用" 按钮

#### ✅ 前端检查
- [ ] 按钮状态变为加载中（显示 spinner）
- [ ] 用户不能重复点击（防止重复提交）
- [ ] 如果已是高级用户，显示相应提示

#### 📝 前端日志检查
```javascript
// src/pages/Subscription.tsx
Creating checkout session for plan: [plan_object]
🔄 Creating checkout session for user: [user_id]
```

---

### 步骤 3: 创建 Stripe Checkout Session
**API调用**: Supabase Edge Function `create-checkout-session`

#### ✅ 前端检查
- [ ] 正确传递参数：
  - `priceId`: price_1RYI6RJ190Ki7I11RybFy23j 或 price_1RYI6kJ190Ki7I11K8bmWjJn
  - `successUrl`: 包含 `{CHECKOUT_SESSION_ID}` 占位符
  - `cancelUrl`: 指向订阅页面
- [ ] API 调用成功返回 session URL

#### 📝 前端日志检查
```javascript
// src/services/subscription.ts
✅ Checkout session created: [session_id]
```

#### 🔧 Edge Function 日志检查
**Supabase Functions Dashboard** → `create-checkout-session`
```javascript
Function called with method: POST
Environment check: { hasStripeKey: true, hasSupabaseUrl: true, hasServiceKey: true }
Request body parsed: { hasUserId: true, hasUserEmail: true, priceId: "price_xxx" }
Creating checkout session for: { userId: "xxx", userEmail: "xxx", priceId: "xxx" }

// 客户处理:
Found existing customer ID: cus_xxx
// 或者
Creating new Stripe customer
Created new Stripe customer: cus_xxx

Creating Stripe checkout session...
Checkout session created successfully: cs_test_xxx
```

#### 💳 Stripe Dashboard 检查
**Events 页面**:
- [ ] 显示新的 `checkout.session.created` 事件
- [ ] 状态为 `200 OK`
- [ ] 时间戳正确

---

### 步骤 4: 重定向到 Stripe 支付页面
**操作**: 自动跳转到 Stripe Checkout

#### ✅ 前端检查
- [ ] 页面成功重定向到 `checkout.stripe.com`
- [ ] URL 包含正确的 session ID
- [ ] 没有 JavaScript 错误

#### 💳 Stripe 页面检查
- [ ] 显示正确的产品名称和价格
- [ ] 显示 "7天免费试用" 信息
- [ ] 客户邮箱已预填
- [ ] 可以输入测试卡信息

---

### 步骤 5: 完成支付
**测试数据**:
- 卡号: `4242 4242 4242 4242`
- CVV: 任意3位数字
- 过期日期: 任意未来日期
- 邮编: 任意邮编

#### ✅ Stripe 页面检查
- [ ] 支付表单验证正常
- [ ] 提交后显示处理中状态
- [ ] 没有错误提示

#### 💳 Stripe Dashboard 检查
**Events 页面**:
- [ ] `payment_method.attached` 事件 (200)
- [ ] `checkout.session.completed` 事件 (200)
- [ ] `customer.subscription.created` 事件 (200)
- [ ] `invoice.payment_succeeded` 事件 (200)

---

### 步骤 6: Webhook 事件处理
**自动触发**: Stripe 发送 webhook 到 Edge Function

#### 🔧 Webhook 事件序列检查
预期事件顺序:
1. `checkout.session.completed`
2. `customer.subscription.created`
3. `invoice.payment_succeeded`

#### 📝 Edge Function 日志检查
**Supabase Functions Dashboard** → `stripe-webhook`

```javascript
// 对于每个事件:
Processing webhook event: checkout.session.completed
Checkout session completed: cs_test_xxx
Updating user subscription: { userId: "xxx", subscriptionId: "sub_xxx" }

Processing webhook event: customer.subscription.created
Subscription created: sub_xxx

Processing webhook event: invoice.payment_succeeded
Invoice payment succeeded: in_xxx

// 成功日志:
Subscription record updated successfully
Updating user to premium tier: [user_id]
Successfully updated user to premium tier
Successfully updated user subscription
```

#### ⚠️ 错误检查
如果看到以下错误，请检查相应设置:
```javascript
// 重复键错误 (已修复):
Error: duplicate key value violates unique constraint "subscriptions_stripe_subscription_id_key"

// 权限错误:
Error: permission denied for table users

// Stripe 错误:
Error: No such price: 'price_xxx'
```

#### 💳 Stripe Webhook 状态
**Webhooks 页面**:
- [ ] 所有事件状态为 `200` (不是 `401` 或 `400`)
- [ ] 重试次数为 `0`
- [ ] 响应时间 < 5秒

---

### 步骤 7: 数据库验证
**检查时机**: Webhook 处理完成后

#### 🗄️ `subscriptions` 表检查
```sql
SELECT * FROM subscriptions 
WHERE user_id = '[测试用户ID]' 
ORDER BY created_at DESC LIMIT 1;
```

**验证字段**:
- [ ] `stripe_subscription_id`: 以 `sub_` 开头
- [ ] `status`: `'active'`
- [ ] `plan_type`: `'premium'` 或 `'starter'`
- [ ] `stripe_price_id`: 正确的价格ID
- [ ] `current_period_start`: 当前时间
- [ ] `current_period_end`: 未来7天 + 1个月
- [ ] `amount`: 999 (starter) 或 1999 (premium)
- [ ] `currency`: `'usd'`

#### 🗄️ `users` 表检查
```sql
SELECT subscription_tier, max_sources, can_schedule_digest, can_process_weekly
FROM users 
WHERE id = '[测试用户ID]';
```

**验证字段**:
- [ ] `subscription_tier`: `'premium'`
- [ ] `max_sources`: `20`
- [ ] `can_schedule_digest`: `true`
- [ ] `can_process_weekly`: `true`

---

### 步骤 8: 成功页面重定向
**预期URL**: `/subscription/success?session_id=cs_test_xxx`

#### ✅ 前端检查
- [ ] 页面自动重定向（如果 Stripe success_url 配置正确）
- [ ] URL 包含 `session_id` 参数
- [ ] 如果没有 `session_id`，页面应检查活跃订阅

#### 📝 成功页面日志检查
```javascript
// src/pages/SubscriptionSuccess.tsx
Found recent active subscription, redirecting to success page
Updating user to premium tier...
User tier updated to premium
```

---

### 步骤 9: 最终验证
**页面**: 订阅成功页面

#### ✅ 用户界面检查
- [ ] 显示成功消息和庆祝图标
- [ ] 显示高级功能列表
- [ ] "开始管理信息源" 按钮可点击
- [ ] "查看订阅详情" 链接正常

#### ✅ 功能验证
- [ ] 返回主页，用户权限已更新
- [ ] 可以添加超过3个信息源
- [ ] 订阅管理页面显示正确状态

---

## 🛠️ 调试工具

### 快速权限修复脚本
如果用户权限没有正确更新，在浏览器控制台运行：

```javascript
(async () => {
  const { createClient } = window.supabase || {};
  const supabase = createClient(
    'https://ryncyvnezqwqqtfsweti.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bmN5dm5lenF3cXF0ZnN3ZXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MzY0MzIsImV4cCI6MjA0OTIxMjQzMn0.iiGNYJPnGFG9-5i2_PJfFgQI8L8L3-zlME1fXPwInkI'
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      max_sources: 20,
      can_schedule_digest: true,
      can_process_weekly: true,
    })
    .eq('id', user.id);
  
  if (!error) {
    console.log('✅ 权限修复成功');
    setTimeout(() => window.location.reload(), 1000);
  }
})();
```

### 调试页面
**URL**: `http://localhost:5173/debug-subscription`
- 显示当前订阅和用户权限状态
- 提供一键同步按钮

---

## 🚨 常见问题排除

### 问题 1: Checkout Session 创建失败 (400错误)
**检查**:
- [ ] `.env.local` 文件中的 Stripe 价格ID是否正确
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 设置
- [ ] `STRIPE_SECRET_KEY` 在 Supabase 环境变量中设置

**解决**:
```bash
# 检查环境变量
npx supabase secrets list

# 重新设置必要的密钥
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

### 问题 2: Webhook 返回 401 Unauthorized
**检查**:
- [ ] `STRIPE_WEBHOOK_SECRET` 环境变量设置
- [ ] Stripe webhook endpoint URL 正确
- [ ] webhook 事件类型已选择

**解决**:
```bash
# 设置 webhook secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# 重新部署 webhook 函数
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

### 问题 3: 用户权限没有更新
**检查**:
- [ ] Webhook 事件是否成功处理
- [ ] 数据库 RLS 策略是否允许更新
- [ ] `users` 表权限设置

**解决**:
1. 运行权限修复脚本
2. 访问 `/debug-subscription` 页面手动同步
3. 检查 Supabase 数据库表权限

---

## 📊 测试结果记录

### 测试信息
- **测试日期**: ___________
- **测试人员**: ___________
- **测试环境**: ___________

### 关键数据
- **测试用户ID**: ___________
- **Stripe Session ID**: ___________
- **Subscription ID**: ___________

### 测试结果
- [ ] 所有步骤通过
- [ ] 部分步骤失败 (请在下方记录)

### 失败步骤记录
```
步骤: ___________
错误描述: ___________
解决方案: ___________
```

---

## 📚 相关文档

- [Stripe 测试卡号](https://stripe.com/docs/testing#cards)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [项目设置文档](./supabase_stripe_setup.md) 