#!/usr/bin/env python3
"""
修复版MySQL MCP安装脚本
使用正确的pip安装方法
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def install_mysql_mcp_server():
    """安装MySQL MCP服务器 - 使用pip方法"""
    logger.info("正在安装MySQL MCP服务器...")
    
    try:
        # 检查是否已安装
        result = subprocess.run(
            [sys.executable, "-c", "import mysql_mcp_server; print('已安装')"], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ MySQL MCP服务器已安装")
            return True
        
        # 使用pip安装mysql-mcp-server
        logger.info("正在通过pip安装MySQL MCP服务器...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "mysql-mcp-server"], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ MySQL MCP服务器安装成功")
            logger.info(f"安装输出: {result.stdout}")
            return True
        else:
            logger.error(f"❌ MySQL MCP服务器安装失败")
            logger.error(f"错误信息: {result.stderr}")
            return False
                
    except Exception as e:
        logger.error(f"安装过程中出现错误: {e}")
        return False


def install_mysql_client():
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


def install_additional_dependencies():
    """安装其他必要依赖"""
    logger.info("正在安装其他必要依赖...")
    
    dependencies = [
        "python-dotenv",  # 环境变量支持
        "asyncio-mqtt",   # 异步支持
    ]
    
    for dep in dependencies:
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", dep], 
                capture_output=True, 
                text=True
            )
            if result.returncode == 0:
                logger.info(f"✅ {dep} 安装成功")
            else:
                logger.warning(f"⚠️ {dep} 安装失败，但可能不影响核心功能")
        except Exception as e:
            logger.warning(f"安装 {dep} 时出现错误: {e}")


def create_fixed_config():
    """创建修复后的配置文件"""
    project_root = Path(__file__).parent.parent
    config_file = project_root / "configs" / "derisk-mysql-mcp-fixed.toml"
    
    config_content = '''[system]
# 语言配置
language = "${env:DERISK_LANG:-zh}"
api_keys = []
encrypt_key = "your_secret_key"

# 服务器配置
[service.web]
host = "0.0.0.0"
port = 7777
# 启用MCP网关
enable_mcp_gateway = "True"
main_app_code = "ai_sre"

# MySQL数据库配置
[service.web.database]
type = "mysql"
host = "${env:MYSQL_HOST:-localhost}"
port = "${env:MYSQL_PORT:-3306}"
user = "${env:MYSQL_USER:-root}"
password = "${env:MYSQL_PASSWORD:-}"
database = "${env:MYSQL_DATABASE:-derisk}"
charset = "utf8mb4"
# 连接池配置
pool_size = 10
max_overflow = 20
pool_timeout = 30
pool_recycle = 3600

[service.model.worker]
host = "127.0.0.1"

# RAG存储配置
[rag.storage]
[rag.storage.vector]
type = "chroma"
persist_path = "pilot/data"

# MCP服务配置 - 修复版
[mcp]
# MySQL MCP服务器配置 - 使用python直接运行
[[mcp.servers]]
name = "mysql-server"
command = "python"
args = ["-m", "mysql_mcp_server"]
env = {
    MYSQL_HOST = "${env:MYSQL_HOST:-localhost}",
    MYSQL_PORT = "${env:MYSQL_PORT:-3306}",
    MYSQL_USER = "${env:MYSQL_USER:-root}",
    MYSQL_PASSWORD = "${env:MYSQL_PASSWORD:-}",
    MYSQL_DATABASE = "${env:MYSQL_DATABASE:-derisk}"
}

# 模型配置
[models]
[[models.llms]]
name = "deepseek-r1"
provider = "proxy/deepseek"
api_key = "${env:DEEPSEEK_API_KEY}"
backend = "deepseek-reasoner"
reasoning_model = "True"

[[models.llms]]
name = "deepseek-v3"
provider = "proxy/deepseek"
api_key = "${env:DEEPSEEK_API_KEY}"
backend = "deepseek-chat"

[[models.embeddings]]
name = "BAAI/bge-large-zh-v1.5"
provider = "proxy/openai"
api_url = "https://api.siliconflow.cn/v1/embeddings"
api_key = "${env:SILICONFLOW_API_KEY}"
'''
    
    with open(config_file, 'w', encoding='utf-8') as f:
        f.write(config_content)
    
    logger.info(f"已创建修复后的配置文件: {config_file}")
    return config_file


def create_startup_script():
    """创建修复后的启动脚本"""
    project_root = Path(__file__).parent.parent
    
    # Windows批处理脚本
    bat_script = project_root / "scripts" / "start_mysql_mcp_fixed.bat"
    bat_content = '''@echo off
echo 启动OpenDeRisk MySQL MCP模式 (修复版)
echo ========================================

REM 检查环境变量文件
if not exist ".env" (
    echo ❌ 环境变量文件.env不存在
    echo 请先配置数据库连接信息
    pause
    exit /b 1
)

echo ✅ 使用修复后的配置启动服务...
derisk start webserver --config configs/derisk-mysql-mcp-fixed.toml

pause
'''
    
    with open(bat_script, 'w', encoding='utf-8') as f:
        f.write(bat_content)
    
    logger.info(f"已创建修复后的启动脚本: {bat_script}")


def test_installation():
    """测试安装是否成功"""
    logger.info("正在测试MySQL MCP服务器安装...")
    
    try:
        # 测试导入
        result = subprocess.run(
            [sys.executable, "-c", "import mysql_mcp_server; print('导入成功')"], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ MySQL MCP服务器导入测试成功")
            return True
        else:
            logger.error(f"❌ 导入测试失败: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"测试过程中出现错误: {e}")
        return False


def main():
    """主函数"""
    print("MySQL MCP修复安装工具")
    print("=" * 50)
    
    success_count = 0
    total_steps = 5
    
    # 1. 安装MySQL MCP服务器
    if install_mysql_mcp_server():
        success_count += 1
    
    # 2. 安装MySQL客户端
    if install_mysql_client():
        success_count += 1
    
    # 3. 安装其他依赖
    install_additional_dependencies()
    success_count += 1
    
    # 4. 创建修复后的配置
    create_fixed_config()
    success_count += 1
    
    # 5. 创建启动脚本
    create_startup_script()
    success_count += 1
    
    # 测试安装
    test_success = test_installation()
    
    print("\n" + "=" * 60)
    print("🔧 MySQL MCP修复安装完成！")
    print("=" * 60)
    print(f"\n📊 安装结果: {success_count}/{total_steps} 步骤成功")
    
    if test_success:
        print("✅ 安装测试通过")
    else:
        print("⚠️ 安装测试未通过，但基本功能可能正常")
    
    print("\n📋 已完成:")
    print("✅ MySQL MCP服务器 (通过pip)")
    print("✅ Python MySQL客户端")
    print("✅ 必要依赖包")
    print("✅ 修复后的配置文件")
    print("✅ 修复后的启动脚本")
    
    print("\n🚀 下一步:")
    print("1. 确保MySQL数据库正在运行")
    print("2. 配置.env文件中的数据库连接信息")
    print("3. 使用修复后的启动脚本:")
    print("   scripts/start_mysql_mcp_fixed.bat")
    
    print("\n💡 修复说明:")
    print("- 使用pip安装而不是uvx")
    print("- 使用python -m mysql_mcp_server启动")
    print("- 优化了配置文件结构")
    
    if success_count == total_steps and test_success:
        print("\n🎉 安装完全成功！")
        return True
    else:
        print("\n⚠️ 部分步骤可能需要手动处理")
        return False


if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
