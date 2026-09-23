@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 恒星系模拟器 - 完整打包
echo [1/2] 正在安装依赖...
call npm install
if errorlevel 1 goto :error
echo [2/2] 正在构建 Windows 安装包...
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