# 全流程 GUI 自动化：键盘驱动(Tab/Enter) + save.json 场景断言
$ErrorActionPreference = 'Continue'
$TOOLS = Split-Path -Parent $MyInvocation.MyCommand.Path
$DRV = Join-Path $TOOLS 'driver.ps1'
$script:PASS = 0; $script:FAIL = 0

function Save-State {
  try {
    return (Get-Content (Join-Path $TOOLS '..\server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json)
  } catch { return $null }
}
function Show-State([string]$tag) {
  $st = Save-State
  if ($st) { Write-Output ("[{0}] scene={1} hp={2} san={3} pts={4} dead={5}" -f $tag, $st.scene_id, $st.hp, $st.san, $st.points, ($st.dead_team -join '+')) }
  else { Write-Output "[$tag] NO_SAVE" }
}
function Go([int]$idx, [string]$expect, [int]$timeoutMs = 5000) {
  $out = & powershell -ExecutionPolicy Bypass -File $DRV go $idx $expect $timeoutMs 2>&1
  $line = ($out | Select-String -Pattern '^GO ') | Select-Object -First 1
  if ($line) { Write-Output $line.ToString() }
  if ("$line" -match 'ok=True') { $script:PASS++; return $true }
  $script:FAIL++
  Write-Output "!! STEP FAILED: expect=$expect got=$line"
  return $false
}
function TextClick {
  # 三连兜底跳过打字机：覆盖短/中/高三种叙事框高度（空区域点击无害）
  foreach ($f in @(0.60, 0.78, 0.88)) {
    & powershell -ExecutionPolicy Bypass -File $DRV rawclick 0.5 $f | Out-Null
    Start-Sleep -Milliseconds 160
  }
}
function Key([byte]$vk, [int]$n) { & powershell -ExecutionPolicy Bypass -File $DRV key $vk $n | Out-Null }
function SleepMs([int]$ms) { Start-Sleep -Milliseconds $ms }

function Node([int]$idx, [string]$expect, [switch]$noSkip) {
  # 常规节点：跳过打字机 → 选择 → 断言
  if (-not $noSkip) { TextClick; SleepMs 350 }
  return (Go $idx $expect 6000)
}
function Fight([string]$winPrefix, [int]$maxRounds = 16) {
  for ($i = 0; $i -lt $maxRounds; $i++) {
    TextClick                       # 加速开场白/日志
    SleepMs 200
    $st = Save-State
    if ($st -and $st.scene_id -like "$winPrefix*") { Write-Output ("WIN -> {0} (rounds={1})" -f $st.scene_id, $i); $script:PASS++; return $true }
    $r = Go 0 $winPrefix 2600       # 攻击(或终结技)；基因锁卡片时 Enter=睁开眼
    if ($r) { return $true }
  }
  Write-Output "!! FIGHT TIMEOUT: $winPrefix"
  $script:FAIL++
  return $false
}

Write-Output '===== 无限轮回 GUI 全流程测试 开始 ====='
Show-State 'init'

# --- 标题 → 序章 ---
if (-not (Go 0 's_office' 8000)) { Write-Output 'ABORT @title'; exit 1 }
SleepMs 1200

# --- 序章 ---
if (-not (Node 0 's_yes'))  { Write-Output 'ABORT @office'; exit 1 }      # 输入 YES
if (-not (Node 0 's_nexus')){ Write-Output 'ABORT @yes'; exit 1 }          # ……
# --- 主神空间 ---
if (-not (Node 0 's_weapon')) { Write-Output 'ABORT @nexus'; exit 1 }      # 提问
if (-not (Node 1 's_warning')) { Write-Output 'ABORT @nexus2'; exit 1 }    # 强迫自己冷静(idx1)
if (-not (Node 0 's_train')) { Write-Output 'ABORT @weapon'; exit 1 }      # 消防斧
Show-State 'weapon'

# --- 地下列车 / 支线A ---
if (-not (Node 0 's_train_rain')) { Write-Output 'ABORT @train'; exit 1 }  # 支线A
if (-not (Node 0 's_mission')) { Write-Output 'ABORT @rain'; exit 1 }      # 列车减速
if (-not (Node 0 's_corridor')) { Write-Output 'ABORT @mission'; exit 1 }  # 跟随队伍

# --- 蜂巢走廊 / 支线B1 ---
if (-not (Node 0 's_observe_lab')) { Write-Output 'ABORT @corridor'; exit 1 }
if (-not (Node 0 's_bhall')) { Write-Output 'ABORT @observe'; exit 1 }

# --- 初遇丧尸（救卡普兰）---
if (-not (Node 0 's_after_zombie1_save' -noSkip)) { Write-Output 'ABORT @zombie1'; exit 1 }
Show-State 'zombie1_win'
if (-not (Node 0 's_find_adrenaline')) { Write-Output 'ABORT @after_zombie'; exit 1 }  # 压下恶心
if (-not (Node 0 's_to_redqueen')) { Write-Output 'ABORT @adrenaline_pick'; exit 1 }   # 收好肾上腺素

# --- 红后 / 支线B2 ---
if (-not (Node 0 's_laser_observed')) { Write-Output 'ABORT @redqueen'; exit 1 }
if (-not (Node 0 's_shutdown')) { Write-Output 'ABORT @observed'; exit 1 }
if (-not (Node 0 's_laser_cine')) { Write-Output 'ABORT @shutdown'; exit 1 }

# --- 过场视频(激光通道)：Enter 触发跳过 → s_laser ---
SleepMs 1500
if (-not (Go 0 's_laser' 9000)) { Write-Output 'ABORT @laser_cine'; exit 1 }

# --- 激光三连QTE（全对：正确项均为首项）---
if (-not (Node 0 's_laser_q2' -noSkip)) { Write-Output 'ABORT @q1'; exit 1 }
if (-not (Node 0 's_laser_q3' -noSkip)) { Write-Output 'ABORT @q2'; exit 1 }
if (-not (Node 0 's_laser_end' -noSkip)) { Write-Output 'ABORT @q3'; exit 1 }
if (-not (Node 0 's_after_laser')) { Write-Output 'ABORT @laser_end'; exit 1 }   # 重启隔离系统
Show-State 'after_laser'
if (-not (Node 0 's_waterway')) { Write-Output 'ABORT @after_laser'; exit 1 }    # 我们还得继续

# --- 水道尸群战 ---
if (-not (Node 0 's_fight_horde' -noSkip)) { Write-Output 'ABORT @waterway'; exit 1 }
if (-not (Fight 's_rain_bitten')) { Write-Output 'ABORT @horde'; exit 1 }
Show-State 'horde_win'

# --- 蕾恩受伤 / 支线C ---
if (-not (Node 0 's_adrenaline_used')) { Write-Output 'ABORT @bitten'; exit 1 }  # 掏出肾上腺素(idx0, 有道具才显示)
if (-not (Node 0 's_boss_intro')) { Write-Output 'ABORT @adrenaline_used'; exit 1 }

# --- BOSS过场：跳过 → 迎战 ---
SleepMs 1500
if (-not (Go 0 's_boss_intro' 3000)) { };   # Enter=跳过视频（场景不变）
SleepMs 600
TextClick
if (-not (Go 0 's_boss' 6000)) { Write-Output 'ABORT @boss_intro'; exit 1 }     # ⚔迎战

# --- BOSS战（含可能的基因锁觉醒卡片）---
$pre = (Save-State).hp
if (-not (Fight 's_escape_train' 20)) { Write-Output 'ABORT @licker'; exit 1 }
Show-State 'boss_win'

# --- 结算 ---
if (-not (Node 0 's_settle' -noSkip)) { Write-Output 'ABORT @escape'; exit 1 }   # ……
SleepMs 800
Show-State 'settle'
# 卡片按钮[0] 查看主神空间 → 兑换卡片 → 按钮[0] 回到标题
if (-not (Go 0 's_settle' 1500)) { }       # Enter 打开主神空间卡（场景字段不变）
SleepMs 700
& powershell -ExecutionPolicy Bypass -File $DRV shot | Out-Null
if (-not (Go 0 's_settle' 1500)) { }       # Enter 点击 进入下一次轮回 → 回标题
SleepMs 1200
$hudOut = & powershell -ExecutionPolicy Bypass -File $DRV hud 2>&1
Write-Output $hudOut

Write-Output ('===== 完成 PASS={0} FAIL={1} =====' -f $script:PASS, $script:FAIL)
