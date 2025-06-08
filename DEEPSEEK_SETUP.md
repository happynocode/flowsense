# DeepSeek API 配置说明

## 环境变量配置

为了使用真实的DeepSeek API功能，你需要配置以下环境变量：

### 必需的环境变量

```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_API_BASE=https://api.deepseek.com

# Supabase配置（如果使用）
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_DB_PASSWORD=your-supabase-db-password

# 前端DeepSeek配置
VITE_DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
```

## 获取DeepSeek API Key

1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 在控制台中创建新的API Key
4. 复制API Key并添加到环境变量中

## 配置步骤

### 1. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
cd digest-flow-daily
cp .env.example .env  # 如果有示例文件
# 或者直接创建
touch .env
```

### 2. 编辑 .env 文件

```bash
# 编辑环境变量文件
nano .env
```

添加以下内容：

```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
DEEPSEEK_API_BASE=https://api.deepseek.com

# 前端配置
VITE_DEEPSEEK_API_KEY=sk-your-actual-api-key-here

# 数据库配置（根据你的设置调整）
DATABASE_URL=postgresql://postgres:password@localhost:5432/content_digest

# 其他配置
SECRET_KEY=your-secret-key-for-flask
```

### 3. 安装依赖

确保安装了所有必需的Python依赖：

```bash
pip install -r requirements.txt
```

### 4. 测试配置

运行以下命令测试DeepSeek API连接：

```python
import os
import requests

# 测试DeepSeek API
api_key = os.getenv('DEEPSEEK_API_KEY')
if api_key:
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": "Hello, this is a test."}
        ],
        "max_tokens": 100
    }
    
    response = requests.post(
        'https://api.deepseek.com/chat/completions',
        headers=headers,
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
else:
    print("DEEPSEEK_API_KEY not found in environment variables")
```

## 功能说明

### 网页抓取功能

项目现在支持两种网页抓取方式：

1. **Newspaper3k**: 智能文章提取，自动识别标题、内容、作者和发布日期
2. **BeautifulSoup**: 增强的HTML解析，支持多种内容提取策略

### DeepSeek总结功能

- 使用DeepSeek API生成中文结构化摘要
- 支持主题提取和引用
- 自动降级到模拟摘要（如果API不可用）
- 支持批量处理和速率限制

## 故障排除

### 常见问题

1. **API Key无效**
   - 检查API Key是否正确
   - 确认API Key有足够的额度
   - 验证API Key权限

2. **网络连接问题**
   - 检查网络连接
   - 确认防火墙设置
   - 尝试使用代理（如果需要）

3. **依赖问题**
   - 确保所有Python包都已安装
   - 检查版本兼容性
   - 重新安装requirements.txt

### 调试模式

启用详细日志记录：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 安全注意事项

1. **不要提交API Key到版本控制**
   - 确保 `.env` 文件在 `.gitignore` 中
   - 使用环境变量而不是硬编码

2. **API Key权限**
   - 只给予必要的权限
   - 定期轮换API Key
   - 监控API使用情况

3. **速率限制**
   - 遵守DeepSeek API的速率限制
   - 实现适当的重试机制
   - 使用缓存减少API调用

## 更新日志

- 2024-01-XX: 集成DeepSeek API
- 2024-01-XX: 增强网页抓取功能
- 2024-01-XX: 添加结构化摘要支持 