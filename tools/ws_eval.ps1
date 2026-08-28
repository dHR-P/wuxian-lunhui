param([string]$Expr = "1+1", [int]$Port = 0)
if ($Port -le 0) {
  $pf = Join-Path $PSScriptRoot 'cdp_port.txt'
  if ($env:CDP_PORT) { $Port = [int]$env:CDP_PORT }
  elseif (Test-Path $pf) { $Port = [int](Get-Content $pf -Raw).Trim() }
  else { $Port = 9223 }
}
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
# 1) list targets
$http = [System.Net.Http.HttpClient]::new()
$targets = $http.GetStringAsync("http://127.0.0.1:$Port/json/list").GetAwaiter().GetResult()
$list = $targets | ConvertFrom-Json
$page = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
if (-not $page) { Write-Output 'NO_PAGE_TARGET'; exit 2 }
$wsUrl = $page.webSocketDebuggerUrl

# 2) CDP over websocket
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([Uri]$wsUrl, $ct).GetAwaiter().GetResult()

$msg = @{ id = 1; method = 'Runtime.evaluate'; params = @{ expression = $Expr; returnByValue = $true; awaitPromise = $true } } | ConvertTo-Json -Depth 5 -Compress
$bytes = [Text.Encoding]::UTF8.GetBytes($msg)
$ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, $ct).GetAwaiter().GetResult()

$buf = New-Object byte[] (4MB)
while ($true) {
  $sb = [System.Text.StringBuilder]::new()
  do {
    $seg = [ArraySegment[byte]]::new($buf)
    $res = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
    [void]$sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $res.Count))
  } while (-not $res.EndOfMessage)
  $txt = $sb.ToString()
  if ($txt -match '"id":1') {
    Write-Output $txt
    break
  }
}
$ws.Dispose()
