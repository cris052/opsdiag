#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenDerisk 禁用缓存配置文件
用于全局禁用系统中的各种缓存功能
"""

import os
from typing import Dict, Any

# 禁用缓存的环境变量配置
DISABLE_CACHE_ENV_VARS = {
    # Python缓存相关
    "PYTHONDONTWRITEBYTECODE": "1",  # 禁用.pyc文件生成
    "PYTHONUNBUFFERED": "1",         # 禁用Python输出缓冲
    
    # OpenDerisk缓存相关
    "DERISK_DISABLE_CACHE": "true",           # 禁用DeRisk缓存
    "DERISK_DISABLE_MODEL_CACHE": "true",     # 禁用模型缓存
    "DERISK_DISABLE_KNOWLEDGE_CACHE": "true", # 禁用知识库缓存
    "DERISK_DISABLE_MESSAGE_CACHE": "true",   # 禁用消息缓存
    "DERISK_DISABLE_VECTOR_CACHE": "true",    # 禁用向量缓存
    
    # Web服务缓存相关
    "NO_CACHE": "1",                 # 通用禁用缓存标志
    "CACHE_DISABLED": "true",        # 缓存禁用标志
}

# 缓存相关配置
CACHE_CONFIG = {
    # 禁用所有缓存类型
    "enable_cache": False,
    "enable_model_cache": False,
    "enable_knowledge_cache": False,
    "enable_message_cache": False,
    "enable_vector_cache": False,
    
    # 缓存过期时间设置为0（立即过期）
    "cache_ttl": 0,
    "model_cache_ttl": 0,
    "knowledge_cache_ttl": 0,
    "message_cache_ttl": 0,
    
    # 缓存大小限制设置为0
    "cache_max_size": 0,
    "model_cache_max_size": 0,
    "knowledge_cache_max_size": 0,
    "message_cache_max_size": 0,
}

def apply_disable_cache_config():
    """应用禁用缓存配置到环境变量"""
    for key, value in DISABLE_CACHE_ENV_VARS.items():
        os.environ[key] = value
        print(f"[缓存配置] 设置环境变量: {key}={value}")

def get_cache_config() -> Dict[str, Any]:
    """获取缓存配置"""
    return CACHE_CONFIG.copy()

def is_cache_disabled() -> bool:
    """检查缓存是否被禁用"""
    return (
        os.getenv("DERISK_DISABLE_CACHE", "false").lower() == "true" or
        os.getenv("NO_CACHE", "0") == "1" or
        os.getenv("CACHE_DISABLED", "false").lower() == "true"
    )

if __name__ == "__main__":
    print("OpenDerisk 缓存禁用配置")
    print("=" * 40)
    apply_disable_cache_config()
    print(f"缓存状态: {'已禁用' if is_cache_disabled() else '已启用'}")
    print("配置应用完成！")
