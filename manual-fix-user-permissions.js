// 手动修复用户权限的浏览器控制台脚本
// 在浏览器开发者工具的控制台中运行此脚本

(async () => {
  console.log('🔧 开始修复用户权限...');
  
  try {
    // 获取Supabase客户端 (假设已在全局可用)
    if (typeof window !== 'undefined' && window.supabase) {
      const supabase = window.supabase;
      
      // 获取当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ 无法获取当前用户:', userError);
        return;
      }
      
      console.log('👤 当前用户ID:', user.id);
      
      // 检查活跃订阅
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (subError) {
        console.error('❌ 获取订阅失败:', subError);
        return;
      }
      
      if (!subscription) {
        console.log('ℹ️ 未找到活跃订阅');
        return;
      }
      
      console.log('✅ 找到活跃订阅:', subscription.stripe_subscription_id);
      
      // 检查用户当前权限
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('subscription_tier, max_sources, can_schedule_digest, can_process_weekly')
        .eq('id', user.id)
        .single();
      
      if (userDataError) {
        console.error('❌ 获取用户数据失败:', userDataError);
        return;
      }
      
      console.log('📊 当前用户权限:', userData);
      
      if (userData.subscription_tier === 'premium') {
        console.log('✅ 用户权限已经是premium，无需修复');
        return;
      }
      
      // 更新用户权限为premium
      console.log('🔄 更新用户权限为premium...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: 'premium',
          max_sources: 20,
          can_schedule_digest: true,
          can_process_weekly: true,
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ 更新用户权限失败:', updateError);
        return;
      }
      
      console.log('🎉 用户权限修复成功！');
      console.log('🔄 请刷新页面查看更新后的权限');
      
      // 可选：自动刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } else {
      console.error('❌ Supabase客户端不可用');
      console.log('💡 请确保您在正确的页面上，并且应用已加载');
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  }
})();

// 使用说明：
console.log(`
🛠️ 用户权限修复脚本已准备就绪

使用方法：
1. 确保您已登录并在应用页面上
2. 在开发者工具控制台中运行此脚本
3. 脚本将自动检查您的订阅状态并修复权限
4. 修复完成后页面会自动刷新

如果脚本无法运行，请尝试：
1. 刷新页面后重新运行
2. 确保您在 http://localhost:5173 上
3. 检查是否有任何网络错误
`); 