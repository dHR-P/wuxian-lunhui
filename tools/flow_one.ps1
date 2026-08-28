# 单会话全流程GUI测试：内嵌CDP客户端(持久WS) + 真实Input事件 + save.json断言
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$TOOLS = Split-Path -Parent $MyInvocation.MyCommand.Path
$PORT = 9677

# ---- 启动游戏 ----
Get-Process wuxian-horror-ch1 -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.Id /T /F 2>$null | Out-Null }
Start-Sleep 2
Remove-Item (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -ErrorAction SilentlyContinue
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$PORT"
Start-Process (Join-Path $TOOLS '..\server-rs\target\release\wuxian-horror-ch1.exe')
Start-Sleep 8

# ---- CDP 连接 ----
$http = [System.Net.Http.HttpClient]::new()
$list = ($http.GetStringAsync("http://127.0.0.1:$PORT/json/list").GetAwaiter().GetResult()) | ConvertFrom-Json
$page = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
if (-not $page) { Write-Output 'FATAL no page target'; exit 2 }
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $ct).GetAwaiter().GetResult()
$script:ID = 10
$buf = New-Object byte[] (4MB)

function SendRecv($obj) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 8 -Compress))
  $GLOBALS:ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, $ct).GetAwaiter().GetResult() | Out-Null
}
function RecvFrame {
  $sb = [System.Text.StringBuilder]::new()
  do {
    $seg = [ArraySegment[byte]]::new($buf)
    $r = $ws.ReceiveAsync($seg, $ct).GetAwaiter().GetResult()
    [void]$sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count))
  } while (-not $r.EndOfMessage)
  return $sb.ToString()
}
