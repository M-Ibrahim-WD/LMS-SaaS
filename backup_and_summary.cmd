@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup_and_summary.ps1" %*
exit /b %errorlevel%
