@echo off
rem Atalho para iniciar.ps1: libera a execucao do script apenas neste processo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" %*
pause
