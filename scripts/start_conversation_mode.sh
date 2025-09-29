#!/bin/bash
echo "启动OpenDeRisk纯对话模式（禁用知识检索）"
echo "================================================"

# 设置环境变量禁用知识检索
export DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true

# 使用纯对话模式配置启动
derisk start webserver --config configs/derisk-conversation-mode.toml
