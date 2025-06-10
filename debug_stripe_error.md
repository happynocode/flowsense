# 🔧 Stripe Edge Function 调试指南

## 当前问题：400错误
您遇到的 `POST https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/create-checkout-session 400 (Bad Request)` 错误。

## 可能的原因：

### 1. 环境变量未设置
Edge Functions需要以下环境变量：
- `STRIPE_SECRET_KEY` 
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. 函数可能未部署
需要先部署函数到Supabase。

## 📋 解决步骤：

### 步骤1：使用Supabase Dashboard设置环境变量

1. **访问 Supabase Dashboard**
   - 打开 https://app.supabase.com/
   - 选择项目 `ryncyvnezqwqqtfsweti`

2. **设置环境变量**
   - 点击左侧菜单 **Settings** → **API** → **Edge Functions**
   - 或者访问：https://app.supabase.com/project/ryncyvnezqwqqtfsweti/settings/edge-functions
   - 添加环境变量：
     ```
     STRIPE_SECRET_KEY=sk_test_你的实际密钥
     SUPABASE_URL=https://ryncyvnezqwqqtfsweti.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=你的service_role密钥
     ```

### 步骤2：部署Edge Functions

#### 方法A：使用Supabase Dashboard（推荐）
1. 在Dashboard中点击 **Edge Functions** 
2. 点击 **New Function**
3. 创建三个函数：
   - `create-checkout-session`
   - `stripe-webhook`
   - `create-portal-session`
4. 复制对应的代码文件内容

#### 方法B：通过Git部署（如果配置了）
1. 确保代码已推送到Git
2. 在Supabase Dashboard配置自动部署

### 步骤3：测试函数

创建一个简单的测试：

```javascript
// 在浏览器控制台测试
const testFunction = async () => {
  const response = await fetch('https://ryncyvnezqwqqtfsweti.supabase.co/functions/v1/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    },
    body: JSON.stringify({
      userId: 'test-user-id',
      userEmail: 'test@example.com',
      priceId: 'price_starter_demo',
      successUrl: 'http://localhost:5173/subscription/success',
      cancelUrl: 'http://localhost:5173/subscription'
    })
  });
  
  const result = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', result);
};

testFunction();
```

### 步骤4：检查日志

在Supabase Dashboard中：
1. 点击 **Edge Functions**
2. 选择 `create-checkout-session` 函数
3. 查看 **Logs** 标签页
4. 查看具体的错误信息

## 🚨 常见错误及解决方案：

### 错误1：Environment variable not set
**解决**：在Dashboard中正确设置所有环境变量

### 错误2：Function not found (404)
**解决**：确保函数已正确部署

### 错误3：CORS errors
**解决**：确保函数包含正确的CORS头

### 错误4：Stripe API errors  
**解决**：检查Stripe密钥是否正确且有效

## 📞 下一步：

1. **优先级1**：设置环境变量
2. **优先级2**：部署Edge Functions
3. **优先级3**：测试基本连接
4. **优先级4**：完整测试支付流程

## 🔍 调试技巧：

1. **查看Network面板**：检查实际发送的请求
2. **查看Console**：查看任何JavaScript错误
3. **查看Supabase Logs**：查看服务器端错误
4. **测试单独组件**：先测试简单的API调用

执行这些步骤后，400错误应该就能解决了！ 