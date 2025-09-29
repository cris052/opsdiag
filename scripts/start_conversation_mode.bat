@echo off
echo 启动OpenDeRisk纯对话模式（禁用知识检索）
echo ================================================

REM 设置环境变量禁用知识检索
set DERISK_DISABLE_KNOWLEDGE_RETRIEVAL=true

REM 使用纯对话模式配置启动
derisk start webserver --config configs/derisk-conversation-mode.toml

pause
