param(
  [switch]$NoBrowser,
  [int]$ServerPort = 0,
  [int]$ClientPort = 0
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $root 'logs'
$configuredServerPort = 4000
if (Test-Path -LiteralPath (Join-Path $root 'server\.env')) {
  $portSetting = Select-String -Path (Join-Path $root 'server\.env') -Pattern '^PORT=(\d+)$' | Select-Object -First 1
  if ($portSetting -and $portSetting.Matches[0].Groups[1].Value) {
    $configuredServerPort = [int]$portSetting.Matches[0].Groups[1].Value
  }
}
$serverPort = if ($ServerPort -gt 0) { $ServerPort } else { $configuredServerPort }
$clientPort = if ($ClientPort -gt 0) { $ClientPort } else { 5173 }
$serverHealth = "http://127.0.0.1:$serverPort/health"
$clientUrl = "http://127.0.0.1:$clientPort/"
$ownedProcessIds = [System.Collections.Generic.List[int]]::new()

New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Test-PinpointEndpoint([string]$Url, [ValidateSet('Backend', 'Frontend')][string]$Kind) {
  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing
    if ($Kind -eq 'Backend') {
      return ($response.Content | ConvertFrom-Json).status -eq 'ok'
    }
    return $response.Content -match '<title>\s*Pinpoint\s*</title>'
  } catch {
    return $false
  }
}

function Start-ProjectScript([string]$Name, [string]$Script, [string[]]$Arguments = @()) {
  $outLog = Join-Path $logs "$Name.out.log"
  $errLog = Join-Path $logs "$Name.err.log"
  $command = $Script
  if ($Arguments.Count) { $command += ' ' + ($Arguments -join ' ') }
  $process = Start-Process -FilePath $env:ComSpec `
    -ArgumentList @('/d', '/s', '/c', "`"$command`"") `
    -WorkingDirectory $root -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $ownedProcessIds.Add($process.Id)
  return $process.Id
}

function Wait-ForEndpoint([string]$Url, [string]$Name, [string]$Kind, [int]$TimeoutSeconds = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PinpointEndpoint $Url $Kind) { return }
    if ($ownedProcessIds.Count -and -not (Get-Process -Id $ownedProcessIds[$ownedProcessIds.Count - 1] -ErrorAction SilentlyContinue)) {
      throw "$Name stopped before becoming ready. Check logs in $logs."
    }
    Start-Sleep -Milliseconds 500
  }
  throw "$Name did not respond at $Url. Check the port and logs in $logs."
}

function Get-ChildProcessIds([int]$ParentId) {
  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction SilentlyContinue)
  foreach ($child in $children) {
    Get-ChildProcessIds -ParentId ([int]$child.ProcessId)
    [int]$child.ProcessId
  }
}

function Stop-OwnedProcesses {
  for ($index = $ownedProcessIds.Count - 1; $index -ge 0; $index--) {
    $processId = $ownedProcessIds[$index]
    $descendants = @(Get-ChildProcessIds -ParentId $processId)
    foreach ($childId in $descendants) {
      Stop-Process -Id $childId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

function Start-DashboardWindow([string]$Url) {
  $browserCandidates = @(
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  if ($browserCandidates.Count) {
    $browserProfile = Join-Path $env:LOCALAPPDATA 'Pinpoint\LauncherBrowser'
    New-Item -ItemType Directory -Force -Path $browserProfile | Out-Null
    return Start-Process -FilePath $browserCandidates[0] `
      -ArgumentList @("--app=$Url", "--user-data-dir=$browserProfile", '--disable-background-mode') -PassThru
  }
  return Start-Process -FilePath $Url -PassThru
}

$startedClient = $false
$startedServer = $false
try {
  if (-not (Test-PinpointEndpoint $serverHealth 'Backend')) {
    $listener = Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue
    if ($listener) { throw "Port $serverPort is busy but the Pinpoint health endpoint did not respond. Stop the process using that port or change the launcher's serverPort." }
    $previousPort = $env:PORT
    $env:PORT = [string]$serverPort
    Start-ProjectScript -Name 'server' -Script 'npm run dev:server' | Out-Null
    if ($null -eq $previousPort) { Remove-Item Env:PORT -ErrorAction SilentlyContinue } else { $env:PORT = $previousPort }
    $startedServer = $true
  }
  Wait-ForEndpoint -Url $serverHealth -Name 'Backend' -Kind 'Backend'

  if (-not (Test-PinpointEndpoint $clientUrl 'Frontend')) {
    $listener = Get-NetTCPConnection -LocalPort $clientPort -State Listen -ErrorAction SilentlyContinue
    if ($listener) { throw "Port $clientPort is busy but the Pinpoint frontend did not respond. Stop the process using that port or change the launcher's clientPort." }
    $previousApiUrl = $env:VITE_API_URL
    $env:VITE_API_URL = "http://127.0.0.1:$serverPort"
    Start-ProjectScript -Name 'client' -Script "npm run dev:client -- --host 127.0.0.1 --port $clientPort --strictPort" | Out-Null
    if ($null -eq $previousApiUrl) { Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue } else { $env:VITE_API_URL = $previousApiUrl }
    $startedClient = $true
  }
  Wait-ForEndpoint -Url $clientUrl -Name 'Frontend' -Kind 'Frontend'

  if ($NoBrowser) {
    Write-Output 'Backend and frontend responded successfully.'
    return
  }

  $browser = Start-DashboardWindow -Url $clientUrl
  if ($startedServer -or $startedClient) {
    while (-not $browser.HasExited) { Start-Sleep -Seconds 1 }
  } else {
    Write-Output 'Pinpoint was already running; no server processes were started.'
  }
} catch {
  Write-Error $_
  Write-Output "Server and client output logs are in: $logs"
  throw
} finally {
  Stop-OwnedProcesses
}
