@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update_version.ps1" %*
exit /b %errorlevel%
