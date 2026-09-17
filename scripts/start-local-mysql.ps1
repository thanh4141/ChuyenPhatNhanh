param([string]$MySqlBin = 'C:\Program Files\MySQL\MySQL Server 8.0\bin')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLocal = Join-Path $taskRoot '.local'
$taskData = Join-Path $taskLocal 'mysql-data'
$taskMysqld = Join-Path $MySqlBin 'mysqld.exe'
if (-not (Test-Path -LiteralPath $taskMysqld)) { throw 'MySQL 8 is required. Pass its bin directory using -MySqlBin.' }
New-Item -ItemType Directory -Path $taskLocal -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $taskData 'mysql'))) {
    New-Item -ItemType Directory -Path $taskData -Force | Out-Null
    & $taskMysqld --no-defaults --initialize-insecure "--datadir=$taskData" --console
    if ($LASTEXITCODE -ne 0) { throw 'Failed to initialize isolated MySQL.' }
}
$taskPortOpen = $false
$taskClient = New-Object System.Net.Sockets.TcpClient
try { $taskClient.Connect('127.0.0.1',3307); $taskPortOpen = $true } catch {} finally { $taskClient.Dispose() }
if (-not $taskPortOpen) {
    $taskArgs = @('--no-defaults', ('--datadir="' + $taskData + '"'), '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=0', '--skip-log-bin', '--console')
    $taskProcess = Start-Process -FilePath $taskMysqld -ArgumentList $taskArgs -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLocal 'mysql.out.log') -RedirectStandardError (Join-Path $taskLocal 'mysql.err.log') -PassThru
    $taskProcess.Id | Set-Content -LiteralPath (Join-Path $taskLocal 'mysql.pid')
}
& node (Join-Path $taskRoot 'Backend\src\scripts\local-setup.js')
if ($LASTEXITCODE -ne 0) { throw 'Local MySQL setup failed; inspect .local/mysql.err.log.' }
