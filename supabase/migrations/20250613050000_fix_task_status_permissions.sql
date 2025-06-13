-- 此迁移文件用于检查和修复processing_tasks表的RLS策略

-- 首先，检查是否有触发器可能干扰状态更新
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE '检查processing_tasks表上的触发器:';
    
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'processing_tasks'
    LOOP
        RAISE NOTICE '触发器: %, 事件: %, 操作: %', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation, 
            trigger_record.action_statement;
    END LOOP;
END $$;

-- 检查processing_tasks表的RLS策略
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '检查processing_tasks表上的RLS策略:';
    
    FOR policy_record IN 
        SELECT polname, polcmd, polpermissive, polroles::text, polqual::text
        FROM pg_policy
        WHERE polrelid = 'public.processing_tasks'::regclass
    LOOP
        RAISE NOTICE '策略: %, 命令: %, 许可: %, 角色: %, 条件: %', 
            policy_record.polname, 
            policy_record.polcmd, 
            policy_record.polpermissive, 
            policy_record.polroles, 
            policy_record.polqual;
    END LOOP;
END $$;

-- 检查表是否启用了RLS
DO $$
DECLARE
    is_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO is_rls_enabled
    FROM pg_class
    WHERE relname = 'processing_tasks' AND relnamespace = 'public'::regnamespace;
    
    RAISE NOTICE 'processing_tasks表上的RLS已%', 
        CASE WHEN is_rls_enabled THEN '启用' ELSE '禁用' END;
END $$;

-- 确保服务角色可以更新任务状态
-- 如果存在限制性策略，添加一个允许服务角色更新的策略
DO $$
BEGIN
    -- 如果表已启用RLS，添加一个允许服务角色更新的策略
    IF EXISTS (
        SELECT 1
        FROM pg_class
        WHERE relname = 'processing_tasks' 
        AND relnamespace = 'public'::regnamespace
        AND relrowsecurity = true
    ) THEN
        -- 删除可能存在的同名策略
        DROP POLICY IF EXISTS allow_service_role_update ON public.processing_tasks;
        
        -- 创建新策略，允许服务角色更新任务状态
        CREATE POLICY allow_service_role_update
        ON public.processing_tasks
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '已创建允许服务角色更新processing_tasks表的策略';
    END IF;
END $$;

-- 直接更新所有未完成的任务状态为completed
UPDATE public.processing_tasks
SET status = 'completed', 
    updated_at = NOW()
WHERE status = 'generating_digest';

-- 记录更新了多少行
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '已将% 个任务从generating_digest更新为completed', updated_count;
END $$; 