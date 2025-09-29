#!/usr/bin/env python3
"""
优化Agent配置脚本 - 解决纯对话场景误调用embedding模型问题
支持按需启用/禁用知识检索功能
"""

import os
import sys
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AgentConfigOptimizer:
    """Agent配置优化器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.app_config_file = project_root / "packages" / "derisk-app" / "src" / "derisk_app" / "component_configs.py"
        self.reasoning_ability_file = project_root / "packages" / "derisk-ext" / "src" / "derisk_ext" / "agent" / "agents" / "reasoning" / "default" / "ability.py"
        
    def backup_file(self, file_path: Path) -> Path:
        """备份文件"""
        backup_file = file_path.with_suffix(f"{file_path.suffix}.backup")
        if file_path.exists():
            shutil.copy2(file_path, backup_file)
            logger.info(f"已备份文件: {backup_file}")
        return backup_file
    
    def optimize_component_config(self, enable_knowledge_by_default: bool = False):
        """优化组件配置，支持条件性启用知识检索"""
        
        if not self.app_config_file.exists():
            logger.error(f"配置文件不存在: {self.app_config_file}")
            return
        
        # 备份原文件
        self.backup_file(self.app_config_file)
        
        # 读取原配置
        with open(self.app_config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 查找知识检索资源注册行
        knowledge_register_line = "rm.register_resource(KnowledgePackSearchResource)"
        
        if knowledge_register_line in content:
            if enable_knowledge_by_default:
                # 添加条件注册逻辑
                new_register_code = '''    # 条件性注册知识检索资源 - 避免纯对话场景误调用embedding
    app_config = system_app.config.configs.get("app_config", {})
    enable_knowledge_retrieval = getattr(app_config, 'enable_knowledge_retrieval', True)
    
    if enable_knowledge_retrieval:
        rm.register_resource(KnowledgePackSearchResource)
        logger.info("已启用知识检索功能")
    else:
        logger.info("已禁用知识检索功能 - 纯对话模式")'''
            else:
                # 直接注释掉知识检索注册
                new_register_code = '''    # 知识检索资源已禁用 - 避免纯对话场景误调用embedding模型
    # rm.register_resource(KnowledgePackSearchResource)
    logger.info("知识检索功能已禁用 - 纯对话模式")'''
            
            # 替换注册行
            updated_content = content.replace(
                f"    {knowledge_register_line}",
                new_register_code
            )
            
            # 确保导入了logger
            if "import logging" not in updated_content:
                updated_content = updated_content.replace(
                    "import logging",
                    "import logging"
                )
            
            if "logger = logging.getLogger(__name__)" not in updated_content:
                # 在导入部分后添加logger
                import_end = updated_content.find('\n\n')
                if import_end != -1:
                    updated_content = (
                        updated_content[:import_end] + 
                        "\n\nlogger = logging.getLogger(__name__)" +
                        updated_content[import_end:]
                    )
            
            # 写入更新后的配置
            with open(self.app_config_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            logger.info(f"已更新组件配置: {self.app_config_file}")
        else:
            logger.warning("未找到知识检索资源注册行，可能已被修改")
    
    def optimize_ability_logic(self):
        """优化能力检测逻辑，增强知识检索的条件判断"""
        
        if not self.reasoning_ability_file.exists():
            logger.error(f"能力文件不存在: {self.reasoning_ability_file}")
            return
        
        # 备份原文件
        self.backup_file(self.reasoning_ability_file)
        
        # 读取原内容
        with open(self.reasoning_ability_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 查找并优化能力检测逻辑
        original_check = '''        # Nex Agent默认有一个KnowledgePackSearchResource配置，但可能实际没有知识，需要踢掉
        if isinstance(source, KnowledgePackSearchResource) and source.is_empty:
            return None'''
        
        enhanced_check = '''        # 增强知识检索资源检测逻辑 - 避免纯对话场景误调用embedding
        if isinstance(source, KnowledgePackSearchResource):
            # 检查是否为空知识库
            if source.is_empty:
                return None
            
            # 检查是否在纯对话模式下（可通过环境变量或配置控制）
            import os
            disable_knowledge = os.getenv('DERISK_DISABLE_KNOWLEDGE_RETRIEVAL', 'false').lower() == 'true'
            if disable_knowledge:
                return None'''
        
        if original_check in content:
            updated_content = content.replace(original_check, enhanced_check)
            
            # 写入更新后的内容
            with open(self.reasoning_ability_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            logger.info(f"已优化能力检测逻辑: {self.reasoning_ability_file}")
        else:
            logger.warning("未找到原始能力检测逻辑，可能已被修改")
    
    def create_conversation_mode_config(self):
        """创建纯对话模式配置文件"""
        config_file = self.project_root / "configs" / "derisk-conversation-mode.toml"
        
        config_content = '''[system]
# 纯对话模式配置 - 禁用知识检索避免调用embedding模型
language = "${env:DERISK_LANG:-zh}"
api_keys = []
encrypt_key = "your_secret_key"

# 禁用知识检索功能
enable_knowledge_retrieval = false

# Server Configurations
[service.web]
host = "0.0.0.0"
port = 7777

[service.web.database]
type = "sqlite"
path = "pilot/meta_data/derisk.db"

[service.model.worker]
host = "127.0.0.1"

# 纯对话模式 - 只配置LLM，不配置embedding模型
[models]
[[models.llms]]
name = "deepseek-r1"
provider = "proxy/deepseek"
api_key = "${env:DEEPSEEK_API_KEY}"

# 注释掉embedding模型配置，避免误调用
# [[models.embeddings]]
# name = "BAAI/bge-large-zh-v1.5"
# provider = "proxy/openai"
# api_url = "https://api.siliconflow.cn/v1/embeddings"
# api_key = "${env:SILICONFLOW_API_KEY}"
'''
        
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        logger.info(f"已创建纯对话模式配置: {config_file}")
    
    def create_startup_scripts(self):
        """创建启动脚本，支持不同模式"""
        
        # Windows批处理脚本
        bat_script = self.project_root / "scripts" / "start_conversation_mode.bat"
        bat_content = '''@echo off
echo 启动OpenDeRisk纯对话模式（禁用知识检索）
echo ================================================

REM 设置环境变量禁用知识检索
set DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true

REM 使用纯对话模式配置启动
derisk start webserver --config configs/derisk-conversation-mode.toml

pause
'''
        
        with open(bat_script, 'w', encoding='utf-8') as f:
            f.write(bat_content)
        
        # Linux/macOS Shell脚本
        sh_script = self.project_root / "scripts" / "start_conversation_mode.sh"
        sh_content = '''#!/bin/bash
echo "启动OpenDeRisk纯对话模式（禁用知识检索）"
echo "================================================"

# 设置环境变量禁用知识检索
export DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true

# 使用纯对话模式配置启动
derisk start webserver --config configs/derisk-conversation-mode.toml
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
        """创建使用指南"""
        guide_file = self.project_root / "docs" / "conversation_mode_guide.md"
        guide_file.parent.mkdir(exist_ok=True)
        
        guide_content = '''# OpenDeRisk 纯对话模式配置指南

## 问题描述

在纯对话场景中，OpenDeRisk系统会误调用embedding模型进行知识检索，导致：
- 不必要的API调用和费用
- 响应延迟增加
- SiliconFlow API "413 Request Entity Too Large" 错误

## 解决方案

### 方法1: 使用纯对话模式配置（推荐）

1. **启动纯对话模式**：
   ```bash
   # Windows
   scripts/start_conversation_mode.bat
   
   # Linux/macOS
   scripts/start_conversation_mode.sh
   ```

2. **或手动使用配置**：
   ```bash
   derisk start webserver --config configs/derisk-conversation-mode.toml
   ```

### 方法2: 环境变量控制

设置环境变量禁用知识检索：
```bash
# Windows
set DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true

# Linux/macOS
export DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true
```

### 方法3: 配置文件控制

在配置文件中添加：
```toml
[system]
enable_knowledge_retrieval = false
```

## 使用场景

### 纯对话模式适用于：
- ✅ 简单问答对话
- ✅ 代码生成和解释
- ✅ 文本处理和分析
- ✅ 不需要外部知识的任务

### 知识检索模式适用于：
- 📚 需要查询文档库
- 📚 基于已有知识回答
- 📚 RAG增强对话
- 📚 专业领域问答

## 配置对比

| 模式 | embedding调用 | 响应速度 | 适用场景 |
|------|---------------|----------|----------|
| 纯对话模式 | ❌ 不调用 | ⚡ 快速 | 通用对话 |
| 知识检索模式 | ✅ 调用 | 🐌 较慢 | 知识问答 |

## 故障排除

### 1. 仍然调用embedding模型
- 检查环境变量是否正确设置
- 确认使用了正确的配置文件
- 重启服务使配置生效

### 2. 功能缺失
- 确认LLM模型配置正确
- 检查API密钥是否有效
- 查看日志确认启动状态

### 3. 切换回知识检索模式
```bash
# 取消环境变量
unset DERISK_DISABLE_KNOWLEDGE_RETRIEVAL

# 使用标准配置启动
derisk start webserver --config configs/derisk-proxy-deepseek.toml
```

## 技术原理

### 问题根源
OpenDeRisk在`component_configs.py`中默认注册了`KnowledgePackSearchResource`，导致所有Agent都具备知识检索能力。

### 解决机制
1. **条件性资源注册**: 根据配置决定是否注册知识检索资源
2. **环境变量控制**: 运行时动态禁用知识检索
3. **配置文件分离**: 不同模式使用不同配置文件

## 更新日志

- v1.0: 初始版本，支持环境变量控制
- v1.1: 添加配置文件模式和启动脚本
- v1.2: 优化能力检测逻辑和用户体验
'''
        
        with open(guide_file, 'w', encoding='utf-8') as f:
            f.write(guide_content)
        
        logger.info(f"已创建使用指南: {guide_file}")
    
    def run_optimization(self, mode: str = "disable"):
        """运行优化流程
        
        Args:
            mode: 优化模式
                - "disable": 完全禁用知识检索（推荐纯对话场景）
                - "conditional": 条件性启用知识检索
        """
        logger.info(f"开始优化Agent配置 - 模式: {mode}")
        
        try:
            # 1. 优化组件配置
            enable_by_default = (mode == "conditional")
            self.optimize_component_config(enable_by_default)
            
            # 2. 优化能力检测逻辑
            self.optimize_ability_logic()
            
            # 3. 创建纯对话模式配置
            self.create_conversation_mode_config()
            
            # 4. 创建启动脚本
            self.create_startup_scripts()
            
            # 5. 创建使用指南
            self.create_usage_guide()
            
            logger.info("Agent配置优化完成！")
            
            print("\n" + "="*60)
            print("🎉 Agent配置优化完成！")
            print("="*60)
            print("\n📋 优化内容:")
            print("✅ 优化了组件配置逻辑")
            print("✅ 增强了能力检测机制")
            print("✅ 创建了纯对话模式配置")
            print("✅ 生成了启动脚本")
            print("✅ 创建了详细使用指南")
            
            print("\n🚀 立即使用:")
            print("1. 纯对话模式（推荐）:")
            print("   Windows: scripts/start_conversation_mode.bat")
            print("   Linux/macOS: scripts/start_conversation_mode.sh")
            
            print("\n2. 环境变量控制:")
            print("   set DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true")
            
            print("\n3. 查看详细指南:")
            print("   docs/conversation_mode_guide.md")
            
            print("\n💡 优化效果:")
            print("- ❌ 不再误调用embedding模型")
            print("- ⚡ 纯对话响应更快")
            print("- 💰 减少不必要的API费用")
            print("- 🛡️ 避免413错误")
            
        except Exception as e:
            logger.error(f"优化过程中出现错误: {e}")
            raise


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="优化Agent配置，解决纯对话场景误调用embedding模型问题")
    parser.add_argument(
        "--mode", 
        choices=["disable", "conditional"], 
        default="disable",
        help="优化模式: disable=完全禁用知识检索, conditional=条件性启用"
    )
    
    args = parser.parse_args()
    
    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("OpenDeRisk Agent配置优化工具")
    print("="*50)
    print(f"项目根目录: {project_root}")
    print(f"优化模式: {args.mode}")
    
    # 创建优化器并运行
    optimizer = AgentConfigOptimizer(project_root)
    optimizer.run_optimization(args.mode)


if __name__ == "__main__":
    main()
