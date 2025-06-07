import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const EnvCheck = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔧 环境变量详细检查:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'undefined',
    allEnvVars: import.meta.env
  });

  const checks = [
    {
      name: 'VITE_SUPABASE_URL',
      value: supabaseUrl,
      isValid: supabaseUrl && supabaseUrl.includes('supabase.co'),
      displayValue: supabaseUrl || '未设置'
    },
    {
      name: 'VITE_SUPABASE_ANON_KEY',
      value: supabaseKey,
      isValid: supabaseKey && supabaseKey.length > 100,
      displayValue: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未设置'
    }
  ];

  const allValid = checks.every(check => check.isValid);

  return (
    <Card className="glass-card border-0 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-starlight">
          {allValid ? (
            <CheckCircle className="w-5 h-5 text-astral-teal mr-2" />
          ) : (
            <XCircle className="w-5 h-5 text-nebula-pink mr-2" />
          )}
          环境变量配置检查
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-midnight/40">
            <div className="flex items-center">
              {check.isValid ? (
                <CheckCircle className="w-4 h-4 text-astral-teal mr-3" />
              ) : (
                <XCircle className="w-4 h-4 text-nebula-pink mr-3" />
              )}
              <div>
                <div className="text-starlight font-medium">{check.name}</div>
                <div className="text-lunar-grey text-sm font-mono">
                  {check.displayValue}
                </div>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              check.isValid 
                ? 'bg-astral-teal/20 text-astral-teal' 
                : 'bg-nebula-pink/20 text-nebula-pink'
            }`}>
              {check.isValid ? '✓ 有效' : '✗ 无效'}
            </div>
          </div>
        ))}
        
        {!allValid && (
          <div className="mt-4 p-4 rounded-lg bg-nebula-pink/10 border border-nebula-pink/30">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-nebula-pink mr-3 mt-0.5" />
              <div>
                <div className="text-nebula-pink font-medium mb-2">配置问题</div>
                <div className="text-lunar-grey text-sm space-y-1">
                  <p>请检查以下步骤：</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>确保项目根目录存在 <code className="bg-midnight/60 px-1 rounded">.env</code> 文件</li>
                    <li>环境变量名必须以 <code className="bg-midnight/60 px-1 rounded">VITE_</code> 开头</li>
                    <li>重启开发服务器 (<code className="bg-midnight/60 px-1 rounded">npm run dev</code>)</li>
                    <li>检查 Supabase 项目设置是否正确</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-electric-blue/10 border border-electric-blue/30">
          <div className="text-electric-blue text-sm">
            <strong>调试信息：</strong> 检查浏览器控制台查看详细的环境变量日志
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnvCheck;