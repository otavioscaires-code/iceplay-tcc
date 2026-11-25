@echo off
setlocal
if "%~1"=="" (
  echo Arraste o arquivo settings.json do perfil HTTPS preparado neste computador para este iniciador.
  echo Consulte LEIA-ME.txt para preparar o acesso pelo celular.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar-ICEPLAY.ps1" -ConfigMobile "%~1"
if errorlevel 1 pause
endlocal
