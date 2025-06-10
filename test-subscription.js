#!/usr/bin/env node

/**
 * 订阅系统自动化测试脚本
 * 用法: node test-subscription.js [user_id]
 */

const https = require('https');
const { execSync } = require('child_process');

// 配置
const SUPABASE_URL = 'https://ryncyvnezqwqqtfsweti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bmN5dm5lenF3cXF0ZnN3ZXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MzY0MzIsImV4cCI6MjA0OTIxMjQzMn0.iiGNYJPnGFG9-5i2_PJfFgQI8L8L3-zlME1fXPwInkI';

class SubscriptionTester {
  constructor() {
    this.results = {
      environment: '❌',
      database: '❌',
      stripe: '❌',
      webhook: '❌',
      user_permissions: '❌'
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      'info': '📋',
      'success': '✅', 
      'error': '❌',
      'warning': '⚠️'
    }[type] || '📋';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async testEnvironment() {
    this.log('检查环境配置...', 'info');
    
    try {
      // 检查开发服务器
      const response = await this.makeRequest('http://localhost:5173', { timeout: 3000 });
      if (response.includes('digest-flow') || response.includes('React')) {
        this.results.environment = '✅';
        this.log('开发服务器运行正常', 'success');
      }
    } catch (error) {
      this.log('开发服务器未启动，请运行: npm run dev', 'error');
      return false;
    }

    try {
      // 检查环境变量
      const envCheck = execSync('npx supabase secrets list', { encoding: 'utf8' });
      if (envCheck.includes('STRIPE_SECRET_KEY') && envCheck.includes('STRIPE_WEBHOOK_SECRET')) {
        this.log('Supabase 环境变量配置正确', 'success');
      } else {
        this.log('缺少必要的环境变量', 'warning');
      }
    } catch (error) {
      this.log('无法检查 Supabase 环境变量', 'warning');
    }

    return true;
  }

  async testDatabase(userId) {
    this.log('检查数据库连接和用户数据...', 'info');
    
    try {
      // 检查用户表
      const userQuery = `
        SELECT id, email, subscription_tier, max_sources, can_schedule_digest, can_process_weekly
        FROM users WHERE id = '${userId}'
      `;
      
      const userData = await this.supabaseQuery(userQuery);
      if (userData && userData.length > 0) {
        const user = userData[0];
        this.log(`用户找到: ${user.email} (tier: ${user.subscription_tier})`, 'success');
        
        // 检查订阅表
        const subQuery = `
          SELECT * FROM subscriptions 
          WHERE user_id = '${userId}' 
          ORDER BY created_at DESC LIMIT 1
        `;
        
        const subData = await this.supabaseQuery(subQuery);
        if (subData && subData.length > 0) {
          const sub = subData[0];
          this.log(`最新订阅: ${sub.stripe_subscription_id} (status: ${sub.status})`, 'success');
          
          // 检查权限一致性
          if (sub.status === 'active' && user.subscription_tier === 'premium') {
            this.results.database = '✅';
            this.results.user_permissions = '✅';
            this.log('用户权限与订阅状态一致', 'success');
          } else if (sub.status === 'active' && user.subscription_tier !== 'premium') {
            this.log('警告: 有活跃订阅但用户权限不是premium', 'warning');
            return { needsSync: true, userId, subscriptionId: sub.stripe_subscription_id };
          }
        } else {
          this.log('未找到订阅记录', 'info');
        }
        
        this.results.database = '✅';
      } else {
        this.log('用户不存在', 'error');
        return false;
      }
    } catch (error) {
      this.log(`数据库检查失败: ${error.message}`, 'error');
      return false;
    }

    return true;
  }

  async testStripeWebhook() {
    this.log('检查 Stripe webhook 状态...', 'info');
    
    try {
      // 这里可以添加对 Stripe API 的调用来检查 webhook 状态
      this.log('提示: 请手动检查 Stripe Dashboard > Webhooks 页面', 'info');
      this.log('确认最近的事件状态都是 200 (成功)', 'info');
      
      // 检查 webhook 函数是否部署
      const functionsCheck = execSync('npx supabase functions list', { encoding: 'utf8' });
      if (functionsCheck.includes('stripe-webhook')) {
        this.results.webhook = '✅';
        this.log('Webhook 函数已部署', 'success');
      }
    } catch (error) {
      this.log('无法检查 Supabase functions', 'warning');
    }

    return true;
  }

  async syncUserPermissions(userId) {
    this.log('同步用户权限...', 'info');
    
    try {
      const updateQuery = `
        UPDATE users SET 
          subscription_tier = 'premium',
          max_sources = 20,
          can_schedule_digest = true,
          can_process_weekly = true
        WHERE id = '${userId}'
      `;
      
      await this.supabaseQuery(updateQuery);
      this.log('用户权限已同步为 premium', 'success');
      this.results.user_permissions = '✅';
      return true;
    } catch (error) {
      this.log(`权限同步失败: ${error.message}`, 'error');
      return false;
    }
  }

  async supabaseQuery(query) {
    // 这是一个简化的实现，实际使用中应该使用 Supabase 客户端库
    this.log(`执行查询: ${query.substring(0, 50)}...`, 'info');
    // 返回模拟数据或实际调用 Supabase API
    return [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 5000;
      const timer = setTimeout(() => reject(new Error('Request timeout')), timeout);
      
      https.get(url, (res) => {
        clearTimeout(timer);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));
    
    Object.entries(this.results).forEach(([key, status]) => {
      const label = {
        environment: '环境配置',
        database: '数据库连接', 
        stripe: 'Stripe 集成',
        webhook: 'Webhook 部署',
        user_permissions: '用户权限'
      }[key];
      
      console.log(`${status} ${label}`);
    });

    console.log('\n' + '='.repeat(50));
    
    const passed = Object.values(this.results).filter(r => r === '✅').length;
    const total = Object.keys(this.results).length;
    
    if (passed === total) {
      console.log('🎉 所有测试通过！订阅系统运行正常。');
    } else {
      console.log(`⚠️  ${passed}/${total} 项测试通过，请检查失败的项目。`);
    }
  }

  async run(userId) {
    console.log('🚀 开始订阅系统测试...\n');
    
    if (!userId) {
      this.log('请提供用户ID: node test-subscription.js [user_id]', 'error');
      return;
    }

    // 运行测试
    await this.testEnvironment();
    const dbResult = await this.testDatabase(userId);
    await this.testStripeWebhook();

    // 如果需要同步权限
    if (dbResult && dbResult.needsSync) {
      this.log('检测到权限不同步，是否自动修复？(y/n)', 'warning');
      // 在实际使用中，这里可以添加用户输入处理
      await this.syncUserPermissions(userId);
    }

    this.printResults();
  }
}

// 脚本入口
if (require.main === module) {
  const userId = process.argv[2];
  const tester = new SubscriptionTester();
  tester.run(userId).catch(console.error);
}

module.exports = SubscriptionTester; 