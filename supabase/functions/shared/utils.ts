import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Updates the status of a processing task with improved error handling and simplified retry logic.
 * 
 * @param supabaseClient - The Supabase client instance.
 * @param taskId - The ID of the task to update.
 * @param status - The new status to set.
 * @param result - An optional object containing the result of the task.
 * @param options - Additional options for the update operation.
 */
export async function updateTaskStatus(
    supabaseClient: ReturnType<typeof createClient>, 
    taskId: number, 
    status: string, 
    result?: any,
    options?: { 
        forceUpdate?: boolean; 
        maxRetries?: number;
        useServiceRole?: boolean;
    }
) {
    const maxRetries = options?.maxRetries || 3;
    let retryCount = 0;
    
    // 验证环境变量
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('❌ Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Missing required environment variables for database connection');
    }

    // 创建服务角色客户端（如果需要）
    let serviceRoleClient: ReturnType<typeof createClient> | null = null;
    if (options?.useServiceRole || options?.forceUpdate) {
        try {
            serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false }
            });
            console.log(`🔑 Created service role client for task ${taskId}`);
        } catch (e) {
            console.error(`❌ Failed to create service role client:`, e);
        }
    }

    while (retryCount < maxRetries) {
        try {
            console.log(`⏳ [Attempt ${retryCount + 1}/${maxRetries}] Updating task ${taskId} to status: ${status}`);
            
            const updatePayload = {
                status,
                result,
                updated_at: new Date().toISOString()
            };

            // 选择合适的客户端
            const client = (serviceRoleClient && (options?.forceUpdate || retryCount > 0)) 
                ? serviceRoleClient 
                : supabaseClient;
            
            if (client === serviceRoleClient) {
                console.log(`🔒 Using service role client for task ${taskId}`);
            }

            // 执行更新
            const { data, error } = await client
                .from('processing_tasks')
                .update(updatePayload)
                .eq('id', taskId)
                .select('id, status');

            if (error) {
                console.error(`❌ Database error for task ${taskId}:`, error.message);
                
                // 如果这是最后一次重试，抛出错误
                if (retryCount === maxRetries - 1) {
                    throw new Error(`Database update failed for task ${taskId}: ${error.message}`);
                }
                
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 指数退避
                continue;
            }

            // 检查是否更新了任何行
            if (!data || data.length === 0) {
                console.warn(`⚠️ Task ${taskId} update affected no rows. Task may not exist or be inaccessible`);
                
                // 如果有服务角色客户端且还没用过，尝试使用它
                if (serviceRoleClient && client !== serviceRoleClient && retryCount < maxRetries - 1) {
                    console.log(`🔄 Retrying with service role client...`);
                    retryCount++;
                    continue;
                }
                
                // 如果这是最后一次重试，记录警告但不抛出错误
                if (retryCount === maxRetries - 1) {
                    console.warn(`⚠️ Task ${taskId} could not be updated after ${maxRetries} attempts`);
                    return; // 不抛出错误，让调用方继续执行
                }
                
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
            }
            
            // 成功更新
            console.log(`✅ Task ${taskId} status successfully updated to '${status}'`);
            return;
            
        } catch (error) {
            console.error(`❌ Unexpected error updating task ${taskId}:`, error);
            
            if (retryCount === maxRetries - 1) {
                throw error;
            }
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
    }
    
    throw new Error(`Failed to update task ${taskId} status after ${maxRetries} attempts`);
} 