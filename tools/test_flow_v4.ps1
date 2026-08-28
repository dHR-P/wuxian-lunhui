# GUI全流程测试 v4：真实鼠标点击(CDP定位+等待按钮渲染) + last_result.json 断言
$ErrorActionPreference = 'Continue'
$TOOLS = Split-Path -Parent $MyInvocation.MyCommand.Path
$DRV = Join-Path $TOOLS 'driver.ps1'
$RES = Join-Path $TOOLS 'last_result.json'
$script:PASS = 0; $script:FAIL = 0

function Save-State {
  try { return (Get-Content (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}
function Show-State([string]$tag) {
  $st = Save-State
  if ($st) { Write-Output ("[{0}] scene={1} hp={2} san={3} pts={4} dead={5}" -f $tag, $st.scene_id, $st.hp, $st.san, $st.points, ($st.dead_team -join '+')) }
  else { Write-Output "[$tag] NO_SAVE" }
}
function B([string]$kw, [string]$expect, [int]$timeoutMs = 10000) {
  $null = & powershell -ExecutionPolicy Bypass -File $DRV jsbtn -idx -1 -expect $expect -timeout $timeoutMs -a1 $kw 2>&1
  try { $r = Get-Content $RES -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $r = $null }
  if ($r -and $r.ok) {
    Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') ("ok kw={0} scene={1}" -f $kw, $r.scene)
    $script:PASS++
    return $true
  }
  $reason = if ($r) { $r.reason } else { 'no-result-file' }
  Add-Content (Join-Path $TOOLS 'artifacts\logs\steps.log') ("FAIL kw={0} reason={1}" -f $kw, $reason)
  $script:FAIL++
  return $false
}
function SleepMs([int]$ms) { Start-Sleep -Milliseconds $ms }

Write-Output '===== 无限轮回 · GUI全流程测试(v4) 开始 ====='
# 随机CDP端口 + 树杀旧实例 + 清存档
$env:CDP_PORT = [string](Get-Random -Minimum 9300 -Maximum 9899)
Get-Process wuxian-horror-ch1 -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.Id /T /F 2>$null | Out-Null }
Start-Sleep 2
Remove-Item (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -ErrorAction SilentlyContinue
Remove-Item (Join-Path $TOOLS 'last_result.json') -ErrorAction SilentlyContinue
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$($env:CDP_PORT)"
Start-Process (Join-Path $TOOLS '..\server-rs\target\release\wuxian-horror-ch1.exe')
Start-Sleep 8
Write-Output ("CDP_PORT={0}" -f $env:CDP_PORT)

if (-not (B '轮回' 's_office' 12000)) { Write-Output 'ABORT@title'; exit 1 }
SleepMs 800

B 'YES' 's_yes' | Out-Null
B '……' 's_nexus' | Out-Null
B '恐怖片世界' 's_weapon' | Out-Null
B '冷静' 's_warning' | Out-Null
B '消防斧' 's_train' | Out-Null
Show-State 'weapon_axe'
B '支线A' 's_train_rain' | Out-Null
B '列车减速' 's_mission' | Out-Null
B '跟随队伍' 's_corridor' | Out-Null
B '支线B1' 's_observe_lab' | Out-Null
B '追上队伍' 's_bhall' | Out-Null

if (-not (B '救卡普兰' 's_after_zombie1_save' 14000)) { Write-Output 'ABORT@zombie1'; Show-State 'zombie_fail'; exit 1 }
Show-State 'zombie_win'
B '压下恶心' 's_find_adrenaline' | Out-Null
B '收好肾上腺素' 's_to_redqueen' | Out-Null
Show-State 'got_adrenaline'
B '支线B2' 's_laser_observed' | Out-Null
B '大家小心' 's_shutdown' | Out-Null
B '冲进玻璃通道' 's_laser_cine' | Out-Null
SleepMs 1500
B '跳过' 's_laser' 9000 | Out-Null            # 视频跳过按钮
if (-not (B '握紧武器' 's_laser')) { Write-Output 'ABORT@laser_cine'; exit 1 }

if (-not (B '判断攻击模式' 's_laser_q1')) { Write-Output 'ABORT@laser'; exit 1 }
B '向上跳跃' 's_laser_q2' | Out-Null
B '贴地滑铲' 's_laser_q3' | Out-Null
B '承重梁' 's_laser_end' | Out-Null
Show-State 'laser_perfect'
B '重启隔离系统' 's_after_laser' | Out-Null
Show-State 'after_laser'
B '我们还得继续' 's_waterway' | Out-Null

if (-not (B '正面开路' 's_rain_bitten' 16000)) { Write-Output 'ABORT@horde'; Show-State 'horde_fail'; exit 1 }
Show-State 'horde_win'
if (-not (B '肾上腺素' 's_adrenaline_used')) { Write-Output 'ABORT@bitten'; exit 1 }   # 支线C
Show-State 'rain_saved'
B '尖啸' 's_boss_intro' | Out-Null
SleepMs 1500
B '跳过' '__skip__' 6000 | Out-Null             # BOSS过场跳过（场景不变，允许失败）
if (-not (B '迎战' 's_boss' 9000)) { Write-Output 'ABORT@boss_intro'; exit 1 }

if (-not (B '终结技' 's_escape_train' 30000)) {
  # 没有终结技就持续普攻/觉醒（jsbtn 会等待按钮出现）
  $ok = $false
  foreach ($kw in @('攻击', '睁', '攻击', '攻击', '攻击', '攻击', '攻击', '终结技', '攻击', '攻击')) {
    if (B $kw 's_escape_train' 9000) { $ok = $true; break }
    $st = Save-State
    if ($st -and $st.scene_id -like 's_escape_train*') { $ok = $true; break }
  }
  if (-not $ok) { Write-Output 'ABORT@licker'; Show-State 'licker_fail'; exit 1 }
}
Show-State 'boss_win'
B '……' 's_settle' 9000 | Out-Null
SleepMs 700
Show-State 'settle'

# 结算卡 → 主神空间兑换卡 → 回到标题
B '查看主神空间' '__card__' 4000 | Out-Null
SleepMs 700
& powershell -ExecutionPolicy Bypass -File $DRV shot | Out-Null
B '进入下一次轮回' '__title__' 5000 | Out-Null
SleepMs 1300
& powershell -ExecutionPolicy Bypass -File $DRV hud 2>&1 | ForEach-Object { $_.ToString() }

Write-Output ('===== 完成 PASS={0} FAIL={1} =====' -f $script:PASS, $script:FAIL)
