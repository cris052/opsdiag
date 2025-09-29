#!/usr/bin/env python3
"""
MySQL MCP配置安装脚本
自动安装MySQL MCP服务器并配置环境
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MySQLMCPSetup:
    """MySQL MCP配置安装器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.env_file = project_root / ".env"
        
    def install_mcp_server_mysql(self):
        """安装MySQL MCP服务器"""
        logger.info("正在安装MySQL MCP服务器...")
        
        try:
            # 使用uvx安装mcp-server-mysql
            result = subprocess.run(
                ["uvx", "--help"], 
                capture_output=True, 
                text=True
            )
            if result.returncode != 0:
                logger.error("uvx未安装，请先安装uv: pip install uv")
                return False
                
            # 安装MySQL MCP服务器
            result = subprocess.run(
                ["uvx", "mcp-server-mysql", "--help"], 
                capture_output=True, 
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ MySQL MCP服务器已安装")
                return True
            else:
                logger.info("正在安装MySQL MCP服务器...")
                # 如果没有安装，uvx会自动安装
                result = subprocess.run(
                    ["uvx", "mcp-server-mysql", "--help"], 
                    capture_output=True, 
                    text=True
                )
                if result.returncode == 0:
                    logger.info("✅ MySQL MCP服务器安装成功")
                    return True
                else:
                    logger.error("❌ MySQL MCP服务器安装失败")
                    return False
                    
        except FileNotFoundError:
            logger.error("uvx命令未找到，请先安装uv工具")
            logger.info("安装命令: pip install uv")
            return False
        except Exception as e:
            logger.error(f"安装过程中出现错误: {e}")
            return False
    
    def install_mysql_client(self):
        """安装MySQL客户端依赖"""
        logger.info("正在检查MySQL客户端依赖...")
        
        try:
            import pymysql
            logger.info("✅ PyMySQL已安装")
            return True
        except ImportError:
            logger.info("正在安装PyMySQL...")
            try:
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", "pymysql"], 
                    capture_output=True, 
                    text=True
                )
                if result.returncode == 0:
                    logger.info("✅ PyMySQL安装成功")
                    return True
                else:
                    logger.error(f"❌ PyMySQL安装失败: {result.stderr}")
                    return False
            except Exception as e:
                logger.error(f"安装PyMySQL时出现错误: {e}")
                return False
    
    def create_env_template(self):
        """创建环境变量模板文件"""
        env_template = """# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=derisk

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key

# SiliconFlow API配置
SILICONFLOW_API_KEY=your_siliconflow_api_key

# 语言配置
DERISK_LANG=zh
"""
        
        env_example_file = self.project_root / ".env.mysql-mcp.example"
        with open(env_example_file, 'w', encoding='utf-8') as f:
            f.write(env_template)
        
        logger.info(f"已创建环境变量模板: {env_example_file}")
        
        # 如果.env文件不存在，复制模板
        if not self.env_file.exists():
            with open(self.env_file, 'w', encoding='utf-8') as f:
                f.write(env_template)
            logger.info(f"已创建环境变量文件: {self.env_file}")
            logger.warning("⚠️  请编辑.env文件，填入正确的数据库连接信息和API密钥")
        else:
            logger.info("环境变量文件已存在，请手动添加MySQL相关配置")
    
    def create_startup_script(self):
        """创建MySQL MCP启动脚本"""
        
        # Windows批处理脚本
        bat_script = self.project_root / "scripts" / "start_mysql_mcp.bat"
        bat_content = '''@echo off
echo 启动OpenDeRisk MySQL MCP模式
echo ===============================

REM 检查环境变量文件
if not exist ".env" (
    echo ❌ 环境变量文件.env不存在
    echo 请复制.env.mysql-mcp.example为.env并配置数据库连接信息
    pause
    exit /b 1
)

REM 加载环境变量（Windows需要手动设置）
echo 请确保已在.env文件中配置了以下环境变量：
echo - MYSQL_HOST
echo - MYSQL_PORT  
echo - MYSQL_USER
echo - MYSQL_PASSWORD
echo - MYSQL_DATABASE
echo - DEEPSEEK_API_KEY
echo.

REM 启动服务
echo 正在启动MySQL MCP模式...
derisk start webserver --config configs/derisk-mysql-mcp.toml

pause
'''
        
        with open(bat_script, 'w', encoding='utf-8') as f:
            f.write(bat_content)
        
        # Linux/macOS Shell脚本
        sh_script = self.project_root / "scripts" / "start_mysql_mcp.sh"
        sh_content = '''#!/bin/bash
echo "启动OpenDeRisk MySQL MCP模式"
echo "==============================="

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "❌ 环境变量文件.env不存在"
    echo "请复制.env.mysql-mcp.example为.env并配置数据库连接信息"
    exit 1
fi

# 加载环境变量
set -a
source .env
set +a

# 检查必要的环境变量
required_vars=("MYSQL_HOST" "MYSQL_USER" "MYSQL_PASSWORD" "MYSQL_DATABASE" "DEEPSEEK_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 环境变量 $var 未设置"
        echo "请在.env文件中配置此变量"
        exit 1
    fi
done

echo "✅ 环境变量检查通过"
echo "正在启动MySQL MCP模式..."

# 启动服务
derisk start webserver --config configs/derisk-mysql-mcp.toml
'''
        
        with open(sh_script, 'w', encoding='utf-8') as f:
            f.write(sh_content)
        
        # 设置执行权限
        try:
            os.chmod(sh_script, 0o755)
        except:
            pass
        
        logger.info(f"已创建启动脚本: {bat_script}, {sh_script}")
    
    def create_usage_guide(self):
        """创建MySQL MCP使用指南"""
        guide_file = self.project_root / "docs" / "mysql_mcp_guide.md"
        guide_file.parent.mkdir(exist_ok=True)
        
        guide_content = '''# OpenDeRisk MySQL MCP配置指南

## 概述

本指南将帮助您配置OpenDeRisk与MySQL数据库的MCP（Model Context Protocol）集成，实现智能数据库操作和查询功能。

## 功能特性

- 🗄️ **数据库连接**: 支持MySQL数据库连接和操作
- 🔍 **智能查询**: 通过自然语言进行数据库查询
- 📊 **数据分析**: AI辅助的数据分析和报告生成
- 🛠️ **数据库管理**: 表结构查询、数据操作等功能
- 🔒 **安全连接**: 支持连接池和安全配置

## 安装步骤

### 1. 运行安装脚本

```bash
# 自动安装和配置
python scripts/setup_mysql_mcp.py
```

### 2. 手动安装（可选）

如果自动安装失败，可以手动执行以下步骤：

```bash
# 安装uv工具
pip install uv

# 安装MySQL MCP服务器
uvx mcp-server-mysql --help

# 安装Python MySQL客户端
pip install pymysql
```

## 配置步骤

### 1. 数据库配置

编辑`.env`文件，配置MySQL连接信息：

```bash
# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=derisk

# API密钥配置
DEEPSEEK_API_KEY=your_deepseek_api_key
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

### 2. 创建数据库

在MySQL中创建数据库：

```sql
CREATE DATABASE derisk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 启动服务

```bash
# Windows
scripts/start_mysql_mcp.bat

# Linux/macOS
scripts/start_mysql_mcp.sh

# 或直接使用配置文件
derisk start webserver --config configs/derisk-mysql-mcp.toml
```

## 使用示例

### 1. 基本数据库查询

```python
import asyncio
from derisk.agent import AgentContext, AgentMemory, LLMConfig, UserProxyAgent
from derisk.agent.expand.tool_assistant_agent import ToolAssistantAgent
from derisk_serve.agent.resource.tool.mcp import MCPToolPack

async def mysql_query_example():
    # 创建MCP工具包，连接MySQL MCP服务器
    tools = MCPToolPack("http://127.0.0.1:8000/sse")
    
    # 配置Agent
    context = AgentContext(conv_id="mysql_test", gpts_app_name="MySQL助手")
    agent_memory = AgentMemory()
    
    # 创建工具助手
    tool_assistant = (
        await ToolAssistantAgent()
        .bind(context)
        .bind(agent_memory)
        .bind(tools)
        .build()
    )
    
    # 执行查询
    await tool_assistant.initiate_chat(
        message="查询用户表中的所有记录"
    )

# 运行示例
asyncio.run(mysql_query_example())
```

### 2. 数据分析任务

```python
# 自然语言数据分析
await tool_assistant.initiate_chat(
    message="分析最近30天的用户注册趋势，并生成图表"
)

# 复杂查询
await tool_assistant.initiate_chat(
    message="找出销售额最高的前10个产品，按地区分组"
)
```

## 配置说明

### 数据库配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `type` | 数据库类型 | mysql |
| `host` | 数据库主机 | localhost |
| `port` | 数据库端口 | 3306 |
| `user` | 用户名 | root |
| `password` | 密码 | - |
| `database` | 数据库名 | derisk |
| `charset` | 字符集 | utf8mb4 |
| `pool_size` | 连接池大小 | 10 |
| `max_overflow` | 最大溢出连接 | 20 |
| `pool_timeout` | 连接超时 | 30秒 |
| `pool_recycle` | 连接回收时间 | 3600秒 |

### MCP服务器配置

```toml
[[mcp.servers]]
name = "mysql-server"
command = "uvx"
args = ["mcp-server-mysql"]
env = {
    MYSQL_HOST = "${env:MYSQL_HOST:-localhost}",
    MYSQL_PORT = "${env:MYSQL_PORT:-3306}",
    MYSQL_USER = "${env:MYSQL_USER:-root}",
    MYSQL_PASSWORD = "${env:MYSQL_PASSWORD:-}",
    MYSQL_DATABASE = "${env:MYSQL_DATABASE:-derisk}"
}
```

## 故障排除

### 1. 连接失败

**问题**: 无法连接到MySQL数据库

**解决方案**:
- 检查MySQL服务是否启动
- 验证连接参数（主机、端口、用户名、密码）
- 确认数据库存在
- 检查防火墙设置

### 2. MCP服务器启动失败

**问题**: MCP服务器无法启动

**解决方案**:
```bash
# 检查uvx是否安装
uvx --version

# 重新安装mcp-server-mysql
uvx --force mcp-server-mysql

# 检查环境变量
echo $MYSQL_HOST
```

### 3. 权限问题

**问题**: 数据库操作权限不足

**解决方案**:
```sql
-- 为用户授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON derisk.* TO 'your_user'@'%';
FLUSH PRIVILEGES;
```

### 4. 字符编码问题

**问题**: 中文字符显示异常

**解决方案**:
- 确保数据库字符集为utf8mb4
- 检查表的字符集设置
- 验证连接字符集配置

## 高级配置

### 1. 多数据库支持

```toml
# 主数据库
[[mcp.servers]]
name = "mysql-main"
command = "uvx"
args = ["mcp-server-mysql"]
env = { MYSQL_DATABASE = "derisk_main" }

# 分析数据库
[[mcp.servers]]
name = "mysql-analytics"
command = "uvx"
args = ["mcp-server-mysql"]
env = { MYSQL_DATABASE = "derisk_analytics" }
```

### 2. 读写分离

```toml
# 主库（写）
[service.web.database.master]
type = "mysql"
host = "master.mysql.example.com"
user = "write_user"

# 从库（读）
[service.web.database.slave]
type = "mysql"
host = "slave.mysql.example.com"
user = "read_user"
```

### 3. SSL连接

```toml
[service.web.database]
type = "mysql"
ssl_ca = "/path/to/ca.pem"
ssl_cert = "/path/to/client-cert.pem"
ssl_key = "/path/to/client-key.pem"
```

## 性能优化

### 1. 连接池优化

```toml
[service.web.database]
pool_size = 20          # 根据并发需求调整
max_overflow = 40       # 峰值连接数
pool_timeout = 60       # 连接超时时间
pool_recycle = 7200     # 连接回收时间
```

### 2. 查询优化

- 为常用查询字段创建索引
- 使用EXPLAIN分析查询计划
- 避免SELECT *，只查询需要的字段
- 合理使用LIMIT限制结果集大小

## 安全建议

1. **用户权限**: 为应用创建专用数据库用户，只授予必要权限
2. **密码安全**: 使用强密码，定期更换
3. **网络安全**: 限制数据库访问IP，使用SSL连接
4. **数据备份**: 定期备份数据库
5. **日志监控**: 启用慢查询日志，监控异常操作

## 更新日志

- v1.0: 初始版本，支持基本MySQL MCP集成
- v1.1: 添加连接池配置和性能优化
- v1.2: 增加安全配置和故障排除指南
'''
        
        with open(guide_file, 'w', encoding='utf-8') as f:
            f.write(guide_content)
        
        logger.info(f"已创建使用指南: {guide_file}")
    
    def run_setup(self):
        """运行完整的安装配置流程"""
        logger.info("开始MySQL MCP安装配置...")
        
        try:
            # 1. 安装MySQL MCP服务器
            if not self.install_mcp_server_mysql():
                logger.error("MySQL MCP服务器安装失败")
                return False
            
            # 2. 安装MySQL客户端依赖
            if not self.install_mysql_client():
                logger.error("MySQL客户端依赖安装失败")
                return False
            
            # 3. 创建环境变量模板
            self.create_env_template()
            
            # 4. 创建启动脚本
            self.create_startup_script()
            
            # 5. 创建使用指南
            self.create_usage_guide()
            
            logger.info("MySQL MCP配置完成！")
            
            print("\n" + "="*60)
            print("🎉 MySQL MCP配置完成！")
            print("="*60)
            print("\n📋 安装内容:")
            print("✅ MySQL MCP服务器")
            print("✅ Python MySQL客户端")
            print("✅ 配置文件模板")
            print("✅ 启动脚本")
            print("✅ 详细使用指南")
            
            print("\n⚙️  下一步操作:")
            print("1. 编辑.env文件，配置数据库连接信息")
            print("2. 创建MySQL数据库: CREATE DATABASE derisk;")
            print("3. 启动服务:")
            print("   Windows: scripts/start_mysql_mcp.bat")
            print("   Linux/macOS: scripts/start_mysql_mcp.sh")
            
            print("\n📚 查看详细指南:")
            print("   docs/mysql_mcp_guide.md")
            
            print("\n💡 功能特性:")
            print("- 🗄️ 智能数据库操作")
            print("- 🔍 自然语言查询")
            print("- 📊 AI数据分析")
            print("- 🛠️ 数据库管理")
            
            return True
            
        except Exception as e:
            logger.error(f"安装过程中出现错误: {e}")
            return False


def main():
    """主函数"""
    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("OpenDeRisk MySQL MCP配置工具")
    print("="*50)
    print(f"项目根目录: {project_root}")
    
    # 创建安装器并运行
    setup = MySQLMCPSetup(project_root)
    success = setup.run_setup()
    
    if success:
        print("\n🚀 配置完成！请按照提示完成后续配置。")
    else:
        print("\n❌ 配置过程中出现错误，请检查日志信息。")
        sys.exit(1)


if __name__ == "__main__":
    main()
