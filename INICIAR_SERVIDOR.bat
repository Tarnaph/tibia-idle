@echo off
title Cavebound MMORPG Web - Servidor Local
echo ========================================================
echo   Iniciando Cavebound MMORPG Web Server (Tibia Idle)
echo ========================================================
echo.
echo 1/2 Verificando assets e inicializando ambiente...
call npm run prepare:game
echo.
echo 2/2 Iniciando servidor Web e servidor multiplayer...
echo Acesse no seu navegador: http://localhost:3000/
echo.
call npm run dev
