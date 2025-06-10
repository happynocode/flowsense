# Stripe订阅系统设置指南

## 第一步：Stripe账户设置

### 1. 创建Stripe产品和价格
在Stripe Dashboard中创建以下产品：

1. **Starter Plan（启动版）**
   - 产品名称：Daily Digest Starter
   - 价格：$9/月（或根据需求调整）
   - 价格ID：保存生成的price_id

2. **Professional Plan（专业版）**
   - 产品名称：Daily Digest Professional
   - 价格：$19/月（或根据需求调整）
   - 价格ID：保存生成的price_id

### 2. 环境变量配置
在`.env.local`文件中添加：

```
# Stripe配置
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe价格ID
VITE_STRIPE_STARTER_PRICE_ID=price_...
VITE_STRIPE_PROFESSIONAL_PRICE_ID=price_...

# Supabase配置（如果还没有）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 第二步：部署Supabase Edge Functions

### 1. 部署函数
运行以下命令部署Edge Functions：

```bash
# 确保已安装Supabase CLI
npm install -g supabase

# 登录Supabase
supabase login

# 关联项目
supabase link

# 部署所有函数
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-portal-session

# 设置环境变量
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. 配置Stripe Webhooks
在Stripe Dashboard的Webhooks部分：

1. 添加端点：`https://xxx.supabase.co/functions/v1/stripe-webhook`
2. 选择以下事件：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. 保存Webhook签名密钥到环境变量

## 第三步：测试订阅流程

### 1. 测试支付流程
1. 使用测试卡号：4242 4242 4242 4242
2. 任意有效的过期日期和CVC
3. 确认订阅创建成功
4. 检查用户权限是否正确更新

### 2. 测试Webhook处理
1. 在Stripe Dashboard查看Webhook事件
2. 确认事件处理成功
3. 验证数据库用户状态更新

## 第四步：生产环境配置

### 1. 替换测试密钥
将所有`pk_test_`和`sk_test_`密钥替换为`pk_live_`和`sk_live_`密钥

### 2. 更新Webhook端点
确保生产环境的Webhook端点正确配置

### 3. 设置客户门户
在Stripe Dashboard的"Settings > Billing > Customer portal"中配置客户门户功能

## 故障排除

### 常见问题：

1. **支付失败**
   - 检查价格ID是否正确
   - 确认Stripe密钥配置正确

2. **权限未更新**
   - 检查Webhook是否正确配置
   - 查看Edge Function日志

3. **客户门户无法访问**
   - 确认用户有stripe_customer_id
   - 检查Stripe账户配置

### 调试命令：
```bash
# 查看函数日志
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook
supabase functions logs create-portal-session

# 测试本地函数
supabase functions serve --debug
```

## 订阅功能说明

- **免费用户**：最多3个信息源，仅"今日"处理，无自动定时
- **付费用户**：最多20个信息源，支持"本周"处理，可设置自动定时摘要
- **免费试用**：7天试用期，试用期内可随时取消
- **客户门户**：用户可以自主管理订阅、查看账单、更新支付方式 