@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 恒星系模拟器 - 快速打包
echo 正在构建网页版和 Windows 安装包...
call npm run build:electron
if errorlevel 1 goto :error
echo.
echo 构建完成，安装包位于 release 目录。
pause
goto :eof
:error
echo.
echo 构建失败，请查看上方错误信息。
pause