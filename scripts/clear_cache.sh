#!/bin/bash

# OpenDeRisk 缓存清理脚本 (Linux/macOS)
# 使用方法: ./scripts/clear_cache.sh

set -e

echo "========================================"
echo "OpenDeRisk 缓存清理脚本 (Linux/macOS)"
echo "========================================"
echo

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "[INFO] 开始清理缓存文件..."
echo "项目根目录: $PROJECT_ROOT"
echo

# 清理Python缓存文件
echo "[1/6] 清理Python __pycache__ 目录..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
echo "✓ Python __pycache__ 目录清理完成"

echo "[2/6] 清理Python .pyc 文件..."
find . -name "*.pyc" -delete 2>/dev/null || true
echo "✓ Python .pyc 文件清理完成"

echo "[3/6] 清理Python .pyo 文件..."
find . -name "*.pyo" -delete 2>/dev/null || true
echo "✓ Python .pyo 文件清理完成"

# 清理消息缓存
echo "[4/6] 清理消息缓存目录..."
if [ -d "pilot/message/cache" ]; then
    rm -rf pilot/message/cache
    echo "✓ 消息缓存目录清理完成"
else
    echo "✓ 消息缓存目录不存在，跳过"
fi

# 清理向量数据库缓存
echo "[5/6] 清理向量数据库缓存..."
if [ -d "pilot/data" ]; then
    rm -rf pilot/data
    echo "✓ 向量数据库缓存清理完成"
else
    echo "✓ 向量数据库缓存不存在，跳过"
fi

# 清理临时文件和日志
echo "[6/6] 清理临时文件和日志..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true
echo "✓ 临时文件和日志清理完成"

# 清理Node.js缓存（如果存在web前端）
if [ -d "web/node_modules" ]; then
    echo "清理Node.js缓存..."
    rm -rf web/node_modules
    echo "✓ Node.js缓存清理完成"
fi

if [ -d "web/.next" ]; then
    echo "清理Next.js缓存..."
    rm -rf web/.next
    echo "✓ Next.js缓存清理完成"
fi

# 清理Python虚拟环境缓存（如果使用venv）
if [ -d ".venv" ]; then
    echo "发现Python虚拟环境，是否删除? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf .venv
        echo "✓ Python虚拟环境清理完成"
    fi
fi

# 清理pip缓存
if command -v pip &> /dev/null; then
    echo "清理pip缓存..."
    pip cache purge 2>/dev/null || true
    echo "✓ pip缓存清理完成"
fi

# 清理uv缓存
if command -v uv &> /dev/null; then
    echo "清理uv缓存..."
    uv cache clean 2>/dev/null || true
    echo "✓ uv缓存清理完成"
fi

echo
echo "========================================"
echo "缓存清理完成！"
echo "========================================"
echo
echo "建议操作："
echo "1. 重新安装依赖: uv sync --all-packages"
echo "2. 重启服务以确保缓存完全清除"
echo
echo "如果遇到权限问题，请使用: sudo ./scripts/clear_cache.sh"
echo
