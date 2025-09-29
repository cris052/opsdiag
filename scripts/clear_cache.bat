@echo off
chcp 65001 >nul
echo ========================================
echo OpenDeRisk 缓存清理脚本 (Windows)
echo ========================================
echo.

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

echo [INFO] 开始清理缓存文件...
echo.

REM 清理Python缓存文件
echo [1/6] 清理Python __pycache__ 目录...
for /d /r . %%d in (__pycache__) do (
    if exist "%%d" (
        echo 删除: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo [2/6] 清理Python .pyc 文件...
for /r . %%f in (*.pyc) do (
    if exist "%%f" (
        echo 删除: %%f
        del /f /q "%%f" 2>nul
    )
)

echo [3/6] 清理Python .pyo 文件...
for /r . %%f in (*.pyo) do (
    if exist "%%f" (
        echo 删除: %%f
        del /f /q "%%f" 2>nul
    )
)

REM 清理消息缓存
echo [4/6] 清理消息缓存目录...
if exist "pilot\message\cache" (
    echo 删除: pilot\message\cache
    rmdir /s /q "pilot\message\cache" 2>nul
)

REM 清理向量数据库缓存
echo [5/6] 清理向量数据库缓存...
if exist "pilot\data" (
    echo 删除: pilot\data
    rmdir /s /q "pilot\data" 2>nul
)

REM 清理临时文件
echo [6/6] 清理临时文件...
for /r . %%f in (*.tmp) do (
    if exist "%%f" (
        echo 删除: %%f
        del /f /q "%%f" 2>nul
    )
)

for /r . %%f in (*.log) do (
    if exist "%%f" (
        echo 删除: %%f
        del /f /q "%%f" 2>nul
    )
)

REM 清理Node.js缓存（如果存在web前端）
if exist "web\node_modules" (
    echo 清理Node.js缓存...
    rmdir /s /q "web\node_modules" 2>nul
)

if exist "web\.next" (
    echo 清理Next.js缓存...
    rmdir /s /q "web\.next" 2>nul
)

echo.
echo ========================================
echo 缓存清理完成！
echo ========================================
echo.
echo 建议操作：
echo 1. 重新安装依赖: uv sync --all-packages
echo 2. 重启服务以确保缓存完全清除
echo.
pause
