@echo off
chcp 65001 >nul
title Duelo de Presentes
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

if exist "node_modules\tiktok-live-connector" goto rodar
echo Instalando, so na primeira vez. Aguarde...
call npm install --no-audit --no-fund
if errorlevel 1 goto erro

:rodar
start "" http://localhost:8080/admin
node server.js
pause
exit /b

:semnode
echo.
echo  O Node.js nao esta instalado.
echo  Vou abrir o site: baixe a versao LTS, instale e abra este arquivo de novo.
start https://nodejs.org/pt
pause
exit /b

:erro
echo.
echo  Deu erro na instalacao. Confira sua internet e tente de novo.
pause
