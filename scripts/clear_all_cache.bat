@echo off
chcp 65001 >nul
echo ========================================
echo OpenDerisk 缓存清理工具
echo ========================================
echo.

echo [1/4] 清理Python字节码缓存文件...
for /r "%~dp0.." %%i in (*.pyc) do (
    echo 删除: %%i
    del "%%i" /q
)

echo.
echo [2/4] 清理__pycache__目录...
for /r "%~dp0.." /d %%i in (__pycache__) do (
    if exist "%%i" (
        echo 删除目录: %%i
        rmdir "%%i" /s /q
    )
)

echo.
echo [3/4] 清理消息缓存目录...
if exist "%~dp0..\pilot\message\cache" (
    echo 删除消息缓存目录...
    rmdir "%~dp0..\pilot\message\cache" /s /q
    mkdir "%~dp0..\pilot\message\cache"
    echo 重新创建空的缓存目录
)

echo.
echo [4/4] 清理日志文件...
if exist "%~dp0..\logs" (
    echo 清理旧日志文件...
    del "%~dp0..\logs\*.log.*" /q 2>nul
    echo 保留当前日志文件
)

echo.
echo ========================================
echo 缓存清理完成！
echo ========================================
echo.
pause
