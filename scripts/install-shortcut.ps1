param(
  [string]$Desktop = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$wrapper = Join-Path $PSScriptRoot 'pinpoint-launcher.vbs'
$icon = Join-Path $PSScriptRoot 'pinpoint.ico'
$shortcutPath = Join-Path $Desktop 'Pinpoint.lnk'

if (-not (Test-Path -LiteralPath $wrapper)) { throw "Launcher wrapper not found: $wrapper" }
if (-not (Test-Path -LiteralPath $icon)) { throw "Pinpoint icon not found: $icon" }
if (-not (Test-Path -LiteralPath $Desktop)) { throw "Desktop folder not found: $Desktop" }

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $wrapper
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = "$icon,0"
$shortcut.Description = 'Start Pinpoint and open the dashboard'
$shortcut.Save()
Write-Output "Installed shortcut: $shortcutPath"
Write-Output 'To uninstall, delete Pinpoint.lnk from the Desktop.'
