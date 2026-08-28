param([string]$Expr = "", [double]$X = 0, [double]$Y = 0, [int]$Port = 0)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
if ($Port -le 0) {
  $pf = Join-Path $PSScriptRoot 'cdp_port.txt'
  if ($env:CDP_PORT) { $Port = [int]$env:CDP_PORT }
  elseif (Test-Path $pf) { $Port = [int](Get-Content $pf -Raw).Trim() }
  else { $Port = 9223 }
}
$http = [System.Net.Http.HttpClient]::new()
$list = ($http.GetStringAsync("http://127.0.0.1:$Port/json/list").GetAwaiter().GetResult()) | ConvertFrom-Json
$page = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
if (-not $page) { Write-Output 'NO_PAGE'; exit 2 }
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $ct).GetAwaiter().GetResult()

function Send-Cmd($obj) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 6 -Compress))
  $ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, $ct).GetAwaiter().GetResult() | Out-Null
}
function Recv-UntilId([int]$id) {
  $buf = New-Object byte[] (4MB)
  while ($true) {
    $sb = [System.Text.StringBuilder]::new()
    do {
      $seg = [ArraySegment[byte]]::new($buf)
      $r = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
      [void]$sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count))
    } while (-not $r.EndOfMessage)
    $txt = $sb.ToString()
    if ($txt -match ('"id":' + $id + '[,}]')) { return $txt }
  }
}

$idN = 10
if ($Expr -ne "") {
  $idN++
  Send-Cmd @{ id = $idN; method = 'Runtime.evaluate'; params = @{ expression = $Expr; returnByValue = $true; awaitPromise = $true } }
  Write-Output (Recv-UntilId $idN)
}
if ($X -ne 0 -or $Y -ne 0) {
  $idN++; Send-Cmd @{ id = $idN; method = 'Input.dispatchMouseEvent'; params = @{ type = 'mouseMoved'; x = $X; y = $Y } }
  [void](Recv-UntilId $idN)
  $idN++; Send-Cmd @{ id = $idN; method = 'Input.dispatchMouseEvent'; params = @{ type = 'mousePressed'; x = $X; y = $Y; button = 'left'; clickCount = 1 } }
  [void](Recv-UntilId $idN)
  Start-Sleep -Milliseconds 60
  $idN++; Send-Cmd @{ id = $idN; method = 'Input.dispatchMouseEvent'; params = @{ type = 'mouseReleased'; x = $X; y = $Y; button = 'left'; clickCount = 1 } }
  [void](Recv-UntilId $idN)
  Write-Output ("CLICKED {0},{1}" -f $X, $Y)
}
$ws.Dispose()
