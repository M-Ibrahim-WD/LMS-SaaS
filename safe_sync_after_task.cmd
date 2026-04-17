@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0safe_sync_after_task.ps1" %*
exit /b %errorlevel%
