@echo off
rem Gera a versao web do app em web\site (para publicar na VM).
rem Rode de novo sempre que mudar o app, depois faca commit/push e "git pull" na VM.
setlocal
cd /d "%~dp0..\app"
if not exist node_modules (
  echo Instalando dependencias...
  call npm install || goto :erro
)
if exist "..\web\site" rmdir /s /q "..\web\site"
call npx expo export --platform web --output-dir ..\web\site || goto :erro
echo.
echo Pronto: web\site atualizado. Agora: git add, commit, push e "git pull" na VM.
pause
exit /b 0
:erro
echo.
echo Falhou. Se o erro falar da versao do Node, rode antes scripts\iniciar.cmd -Modo web uma vez.
pause
exit /b 1
