@echo off
chcp 65001 >nul
echo ========================================
echo OpenDerisk 应用禁用缓存配置
echo ========================================
echo.

echo [1/2] 应用禁用缓存环境变量配置...
python "%~dp0..\configs\disable_cache_config.py"

echo.
echo [2/2] 设置系统环境变量...
setx PYTHONDONTWRITEBYTECODE 1
setx PYTHONUNBUFFERED 1
setx DERISK_DISABLE_CACHE true
setx DERISK_DISABLE_MODEL_CACHE true
setx DERISK_DISABLE_KNOWLEDGE_CACHE true
setx DERISK_DISABLE_MESSAGE_CACHE true
setx DERISK_DISABLE_VECTOR_CACHE true
setx NO_CACHE 1
setx CACHE_DISABLED true

echo.
echo ========================================
echo 禁用缓存配置应用完成！
echo 请重启应用程序以使配置生效。
echo ========================================
echo.
pause
