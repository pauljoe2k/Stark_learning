@echo off
setlocal
set "ROOT=%~dp0.."
set "ROOT=%ROOT%\"
set "SCRIPT=%ROOT%scripts\pinpoint-launcher.ps1"
if not exist "%SCRIPT%" (
  echo Pinpoint launcher script not found: "%SCRIPT%"
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
endlocal
