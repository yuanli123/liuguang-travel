@echo off
chcp 65001 >nul
rem 流光幻旅 · 一键启动（双击本文件）
rem 会弹出两个命令行窗口：前端(8123) + 后端(3000)，关闭窗口即停止服务

echo 正在启动流光幻旅...
echo 前端：http://localhost:8123
echo 后端：http://localhost:3000
echo.

start "流光幻旅-前端(8123)" cmd /k "cd /d "%~dp0" && python -m http.server 8123"
start "流光幻旅-后端(3000)" cmd /k "cd /d "%~dp0server" && npm run dev"

echo 已启动两个服务窗口。浏览器打开 http://localhost:8123 即可使用。
echo 关闭对应窗口即可停止服务。
timeout /t 5
