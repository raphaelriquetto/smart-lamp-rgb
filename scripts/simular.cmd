@echo off
rem Simula a VM (Orion + site) e o ESP32 neste PC. Abre o app e a lampada virtual no navegador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" -Modo simular
pause
