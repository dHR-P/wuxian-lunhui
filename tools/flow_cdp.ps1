# 单会话全流程测试：CDP evaluate 内点击按钮 + save.json 断言
# ⚠️ 已废弃（2026-08-27）：P0 开放世界重构后开局直接进 worldView 世界模式（不再走 s_office 卡片链），
#    本脚本的卡片式点击序列整体过时。全章节逻辑回归由 `cargo test --test playthrough`（8/8 含 full_playthrough）覆盖，
#    世界模式/主神链路 CDP 验收改用 tools/world_flow.mjs（10/10）与 tools/nexus_flow.mjs（9/9）。
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$TOOLS = Split-Path -Parent $MyInvocation.MyCommand.Path
$PORT = 9678

Get-Process wuxian-horror-ch1 -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.Id /T /F 2>$null | Out-Null }
Start-Sleep 2
Remove-Item (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -ErrorAction SilentlyContinue
Remove-Item (Join-Path $TOOLS 'artifacts\logs\steps.log') -ErrorAction SilentlyContinue
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$PORT"
Start-Process (Join-Path $TOOLS '..\server-rs\target\release\wuxian-horror-ch1.exe')
Start-Sleep 8

$http = [System.Net.Http.HttpClient]::new()
$list = ($http.GetStringAsync("http://127.0.0.1:$PORT/json/list").GetAwaiter().GetResult()) | ConvertFrom-Json
$page = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
if (-not $page) { Write-Output 'FATAL no target'; exit 2 }
$script:WS = [System.Net.WebSockets.ClientWebSocket]::new()
$script:CT = [System.Threading.CancellationToken]::None
$script:WS.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $script:CT).GetAwaiter().GetResult()
$script:NEXTID = 10
$script:BUF = New-Object byte[] (4MB)

function Invoke-Cdp($obj) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 8 -Compress))
  $script:WS.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $script:CT).GetAwaiter().GetResult() | Out-Null
}
function RecvFrame {
  $sb = New-Object System.Text.StringBuilder
  do {
    $seg = [ArraySegment[byte]]::new($script:BUF)
    $r = $script:WS.ReceiveAsync($seg, $script:CT).GetAwaiter().GetResult()
    [void]$sb.Append([Text.Encoding]::UTF8.GetString($script:BUF, 0, $r.Count))
  } while (-not $r.EndOfMessage)
  return $sb.ToString()
}
function EvalJs([string]$expression) {
  $script:NEXTID++
  $id = $script:NEXTID
  Invoke-Cdp @{ id = $id; method = 'Runtime.evaluate'; params = @{ expression = $expression; returnByValue = $true; awaitPromise = $true } }
  while ($true) {
    $txt = RecvFrame
    if ($txt -match ('"id":' + $id + '[,}]')) {
      $o = $txt | ConvertFrom-Json
      return $o.result.result.value
    }
  }
}

function Get-Scene {
  try {
    $raw = Get-Content (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    return $raw.scene_id
  } catch { return '' }
}
# 在浏览器内按关键词点击可见按钮；先点文字框快进打字机（skipType 同步渲染选项）；返回被点的标签或 ''
function Click-Kw([string]$kw) {
  $e = "(function(){const box=document.getElementById('narrBox');if(box&&box.offsetParent!==null)box.click();" +
       "const kw=" + ($kw | ConvertTo-Json -Compress) + ";" +
       "const els=[...document.querySelectorAll('#choices .choice,.menuBtns .mbtn,.ovCard .mbtn,#cineSkip')].filter(b=>b.offsetParent!==null);" +
       "const hit=els.find(b=>(b.innerText||'').replace(/\s+/g,'').includes(kw));" +
       "if(hit){const t=(hit.innerText||'').replace(/\s+/g,'');hit.click();return t;}return '';})()"
  return [string](EvalJs $e)
}
function B([string]$kw, [string]$expect, [int]$timeoutMs = 12000) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.ElapsedMilliseconds -lt $timeoutMs) {
    $label = Click-Kw $kw
    if ($label -ne '') {
      $deadline = [DateTime]::UtcNow.AddMilliseconds([Math]::Min(3000, $timeoutMs))
      while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 200
        $sc = Get-Scene
        if (-not $expect -or $sc -like "$expect*") {
          Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') ("ok   [{0}] -> {1}" -f $kw, $sc)
          Write-Host ("OK   [{0}] -> {1}" -f $kw, $sc)
          $script:PASS++
          return $true
        }
      }
      # 场景未变：可能点到了但需要再次尝试（如战斗日志刷新）
      return $false
    }
    Start-Sleep -Milliseconds 350
  }
  Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') ("FAIL [{0}] no-button" -f $kw)
  Write-Host ("FAIL [{0}] no-button" -f $kw)
  $script:FAIL++
  return $false
}
function SleepMs([int]$ms) { Start-Sleep -Milliseconds $ms }
function Show-State([string]$tag) {
  try {
    $st = Get-Content (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Output ("[{0}] scene={1} hp={2} san={3} pts={4} dead={5}" -f $tag, $st.scene_id, $st.hp, $st.san, $st.points, ($st.dead_team -join '+'))
  } catch { Write-Output "[$tag] NO_SAVE" }
}

Write-Output "===== 无限轮回 · CDP全流程测试 开始 (port=$PORT) ====="
if (-not (B '轮回' 's_office' 15000)) {
  $probe = EvalJs "(function(){try{return (document.body.innerText||'').replace(/\s+/g,' ').slice(0,200)+' | btns='+document.querySelectorAll('button,.mbtn,.choice').length;}catch(e){return 'eval-err '+e.message;}})()"
  Write-Output "DIAG title-page: $probe"
  Write-Output 'ABORT@title'; exit 1
}
Start-Sleep 600

B 'YES' 's_yes' | Out-Null
B '……' 's_nexus' | Out-Null
B '恐怖片世界' 's_weapon' | Out-Null
B '冷静' 's_warning' | Out-Null
B '消防斧' 's_train' | Out-Null
Show-State 'weapon'
B '支线A' 's_train_rain' | Out-Null
B '列车减速' 's_mission' | Out-Null
B '跟随队伍' 's_corridor' | Out-Null
B '支线B1' 's_observe_lab' | Out-Null
B '追上队伍' 's_bhall' | Out-Null
if (-not (B '救卡普兰' 's_after_zombie1_save' 16000)) { Show-State 'zombie_fail'; Write-Output 'ABORT'; exit 1 }
Show-State 'zombie_win'
B '压下恶心' 's_find_adrenaline' | Out-Null
B '收好肾上腺素' 's_to_redqueen' | Out-Null
Show-State 'adr'
B '支线B2' 's_laser_observed' | Out-Null
B '大家小心' 's_shutdown' | Out-Null
B '冲进玻璃通道' 's_laser_cine' | Out-Null
SleepMs 1200
B '跳过' 's_laser' 9000 | Out-Null
if (-not (B '握紧武器' 's_laser')) { Write-Output 'ABORT@cine2'; exit 1 }
if (-not (B '判断攻击模式' 's_laser_q1')) { Write-Output 'ABORT@laser'; exit 1 }
B '向上跳跃' 's_laser_q2' | Out-Null
B '贴地滑铲' 's_laser_q3' | Out-Null
B '承重梁' 's_laser_end' | Out-Null
Show-State 'laser_ok'
B '重启隔离系统' 's_after_laser' | Out-Null
Show-State 'after_laser'
B '我们还得继续' 's_waterway' | Out-Null
if (-not (B '正面开路' 's_rain_bitten' 18000)) { Show-State 'horde_fail'; Write-Output 'ABORT'; exit 1 }
Show-State 'horde_win'
if (-not (B '肾上腺素' 's_adrenaline_used')) { Write-Output 'ABORT@bite'; exit 1 }
Show-State 'rain_saved'
B '尖啸' 's_boss_intro' | Out-Null
SleepMs 1200
B '跳过' '__v__' 5000 | Out-Null
if (-not (B '迎战' 's_boss' 9000)) { Write-Output 'ABORT@bossintro'; exit 1 }

# BOSS 战循环（终结技优先 → 觉醒卡片 → 普攻）
$win = $false
foreach ($i in 1..24) {
  if ((Get-Scene) -like 's_escape_train*') { $win = $true; break }
  if (B '终结技' 's_escape_train' 4000) { $win = $true; break }
  if ((Get-Scene) -like 's_escape_train*') { $win = $true; break }
  if (B '睁' 's_boss' 4000) { continue }
  if (B '攻击' 's_escape_train' 6000) { $win = $true; break }
}
if (-not $win) { Show-State 'licker_fail'; Write-Output 'ABORT@boss'; exit 1 }
Show-State 'boss_win'
B '……' 's_settle' 9000 | Out-Null
SleepMs 700
Show-State 'settle'
# P1 后：结算卡按钮改为「进 入 主 神 空 间 ▶」→ __enter_nexus__ 直达主神空间世界
if (-not (B '进入主神空间' '' 8000)) { Write-Output 'ABORT@nexus_enter'; exit 1 }
Start-Sleep 1500
$stf = Get-Content (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($stf.world_id -eq 'zhutianshenkong') {
  Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') 'ok   [P1 进入主神空间] world_id=zhutianshenkong'
  Write-Output 'OK   [P1 进入主神空间] world_id=zhutianshenkong'
  $script:PASS++
} else {
  Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') "FAIL [P1 进入主神空间] world_id=$($stf.world_id)"
  Write-Output "FAIL [P1 进入主神空间] world_id=$($stf.world_id)"
  $script:FAIL++
}

Write-Output ("===== 完成 PASS={0} FAIL={1} =====" -f $script:PASS, $script:FAIL)
