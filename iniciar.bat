@echo off
chcp 65001 > nul
title Lista de Presentes - Rayza e Guilherme
echo ========================================================
echo   🎁 Lista de Presentes - Rayza & Guilherme 💖
echo ========================================================
echo.
echo Iniciando o servidor...
echo Abrindo o navegador em: http://localhost:3000
echo.
echo Para fechar o site, basta fechar esta janela.
echo.
start http://localhost:3000
node server.js
pause

