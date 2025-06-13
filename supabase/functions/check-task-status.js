// 简单的脚本，用于检查任务状态
// 使用方法：node check-task-status.js <task_id>

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('环境变量SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY必须设置');
  process.exit(1);
}

const taskId = process.argv[2];
if (!taskId) {
  console.error('使用方法：node check-task-status.js <task_id>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTaskStatus() {
  try {
    // 使用服务角色密钥查询
    const { data: serviceRoleData, error: serviceRoleError } = await supabase
      .from('processing_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (serviceRoleError) {
      console.error('服务角色查询错误:', serviceRoleError);
    } else {
      console.log('使用服务角色查询结果:');
      console.log(JSON.stringify(serviceRoleData, null, 2));
    }

    // 尝试更新状态
    if (serviceRoleData && serviceRoleData.status !== 'completed') {
      console.log(`\n尝试将任务 ${taskId} 的状态从 "${serviceRoleData.status}" 更新为 "completed"...`);
      
      const { data: updateData, error: updateError } = await supabase
        .from('processing_tasks')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select();
      
      if (updateError) {
        console.error('更新错误:', updateError);
      } else {
        console.log('更新结果:');
        console.log(JSON.stringify(updateData, null, 2));
        
        // 验证更新
        const { data: verifyData, error: verifyError } = await supabase
          .from('processing_tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        
        if (verifyError) {
          console.error('验证查询错误:', verifyError);
        } else {
          console.log('\n验证更新结果:');
          console.log(JSON.stringify(verifyData, null, 2));
          
          if (verifyData.status === 'completed') {
            console.log('\n✅ 状态已成功更新为 "completed"');
          } else {
            console.log(`\n❌ 状态仍然是 "${verifyData.status}"`);
          }
        }
      }
    }
  } catch (error) {
    console.error('未处理的错误:', error);
  }
}

checkTaskStatus().catch(console.error); 