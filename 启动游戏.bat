@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 恒星系模拟器
if not exist node_modules (
  echo [1/2] 正在安装依赖...
  call npm install
  if errorlevel 1 goto :error
)
echo [2/2] 正在启动开发服务器...
call npm run dev -- --open
goto :eof
:error
echo.
echo 启动失败，请确认已安装 Node.js 24。
pause