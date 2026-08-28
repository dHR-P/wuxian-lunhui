# GUI测试驱动 v2：像素检测按钮 + 点击 + 场景断言
param([string]$cmd, [int]$idx = -1, [string]$expect = '', [int]$timeoutMs = 6000, [double]$a2 = 0, [double]$a3 = 0, [string]$a1 = '')
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSScriptRoot   # games/wuxian-horror-ch1
Add-Type -AssemblyName System.Drawing
if (-not ('W32' -as [type])) {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct PT { public int X,Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool alt);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref PT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
}
"@
}
[void][W32]::SetProcessDPIAware()
$proc = Get-Process wuxian-horror-ch1 -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw 'game window not found' }
$h = $proc.MainWindowHandle
[void][W32]::SwitchToThisWindow($h,$true)
Start-Sleep -Milliseconds 200
$r = New-Object W32+RECT
[void][W32]::GetClientRect($h, [ref]$r)
$pt = New-Object W32+PT; $pt.X = 0; $pt.Y = 0
[void][W32]::ClientToScreen($h, [ref]$pt)
$W = $r.R; $H = $r.B
$shotDir = Join-Path $PSScriptRoot 'shots'

function Take-Shot([string]$name) {
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($pt.X, $pt.Y, 0, 0, (New-Object System.Drawing.Size($W, $H)))
  $path = Join-Path $shotDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  return @($bmp, $path)
}

function Close-Bmp($bmp) { $bmp.Dispose() }

# 在竖直条带内寻找血红竖条(#7a0e1c±tol)的行簇 → 返回每个簇的cy与cx中心
function Find-Accents($bmp, [int]$x0, [int]$x1, [double]$y0f, [double]$y1f) {
  $rows = @()
  $y0 = [int]($H * $y0f); $y1 = [int]($H * $y1f)
  for ($y = $y0; $y -lt $y1; $y++) {
    $hit = 0; $sx = -1
    for ($x = $x0; $x -le $x1; $x++) {
      $p = $bmp.GetPixel($x, $y)
      if ([math]::Abs($p.R - 122) -le 30 -and [math]::Abs($p.G - 14) -le 26 -and [math]::Abs($p.B - 28) -le 30) { $hit++; if ($sx -lt 0) { $sx = $x } }
    }
    if ($hit -ge 2) { $rows += ,@($y, ($sx + 1)) }
  }
  # 聚类：相邻≤6px合并
  $clusters = @()
  foreach ($rc in $rows) {
    if ($clusters.Count -gt 0) {
      $last = $clusters[-1]
      if ($rc[0] - $last[2] -le 6) { $last[2] = $rc[0]; $last[3]++; continue }
    }
    $clusters += ,@($rc[0], $rc[1], $rc[0], 1)  # y0,x,y1,count
  }
  return $clusters | ForEach-Object { @{ cy = [int](($_[0] + $_[2]) / 2); cx = $_[1]; n = $_[3] } } | Where-Object { $_.n -ge 8 }
}

function Real-Click([int]$x, [int]$y) {
  [void][W32]::SetCursorPos($x, $y)
  Start-Sleep -Milliseconds 100
  [W32]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 70
  [W32]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KBD {
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
"@
function Send-Key([byte]$vk, [int]$times) {
  for ($i = 0; $i -lt $times; $i++) {
    [KBD]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 45
    [KBD]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)   # KEYUP
    Start-Sleep -Milliseconds 90
  }
}

function Save-State([object]$st) {
  try { return (Get-Content (Join-Path $ROOT 'server-rs\target\release\data\save.json') -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}

switch ($cmd) {
  'probe' {
    $b, $path = Take-Shot ("{0:HHmmss}_probe.png" -f (Get-Date))
    $acc = Find-Accents $b 300 420 0.35 1.0     # 选择条左缘带(故事面板左≈(1600-920)/2=340)
    $menu = Find-Accents $b ([int]($W/2)-170) ([int]($W/2)-130) 0.30 0.95  # 标题按钮左缘
    Close-Bmp $b
    Write-Output ("CLIENT {0}x{1}" -f $W, $H)
    Write-Output ("CHOICES " + (($acc | ForEach-Object { "$($_.cx),$($_.cy)" }) -join ' | '))
    Write-Output ("MENU    " + (($menu | ForEach-Object { "$($_.cx),$($_.cy)" }) -join ' | '))
    Write-Output "SHOT $path"
  }
  'go' {
    # 键盘导航：Tab×idx + Enter；带焦点重试（子进程控制台可能抢占前台）
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $ok = $false; $sid = ''
    while ($sw.ElapsedMilliseconds -lt $timeoutMs) {
      [void][W32]::SwitchToThisWindow($h,$true)
      Start-Sleep -Milliseconds 260
      if ($idx -gt 0) { Send-Key 0x09 $idx }
      Start-Sleep -Milliseconds 120
      Send-Key 0x0D 1
      $deadline = [DateTime]::UtcNow.AddMilliseconds([Math]::Min(2200, $timeoutMs))
      while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 200
        $st = Save-State $null
        if ($st -and $st.scene_id) {
          $sid = $st.scene_id
          if ($sid -like "$expect*") { $ok = $true; break }
        }
      }
      if ($ok) { break }
    }
    Write-Output ("GO tab={0} scene={1} expect={2} ok={3}" -f $idx, $sid, $expect, $ok)
    if (-not $ok) { exit 4 }
  }
  'key' {
    # key <vk> <times>: 原始按键
    Send-Key ([byte]$idx) ([int]$a2)
    Write-Output ("KEY {0} x{1}" -f $idx, $a2)
  }
  'goc' {
    # 几何点击选择堆: idx=序号 expect=期望场景; a2=k总数 a3=是否带副标题(1/0)
    $k = [int]$a2; $sub = [int]$a3
    $h_i = $(if ($sub -eq 1) { 64 } else { 44 })
    $step = $h_i + 8
    $cy = [int]($H - 26 - ($k - 1 - $idx) * $step - $h_i / 2)
    $cx = [int]($W / 2)
    foreach ($dy in @(0, -20, 20)) {
      [void][W32]::SwitchToThisWindow($h,$true); Start-Sleep -Milliseconds 120
      Real-Click ($pt.X + $cx) ($pt.Y + $cy + $dy)
      $deadline = [DateTime]::UtcNow.AddMilliseconds([Math]::Min(2400, $timeoutMs))
      while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 200
        $st = Save-State $null
        if ($st -and $st.scene_id -like "$expect*") { Write-Output ("GOC ok idx={0} y={1} scene={2}" -f $idx, ($cy + $dy), $st.scene_id); exit 0 }
      }
    }
    Write-Output ("GOC FAIL idx={0} expect={1}" -f $idx, $expect); exit 4
  }
  'skipvideo' {
    [void][W32]::SwitchToThisWindow($h,$true); Start-Sleep -Milliseconds 150
    Real-Click ($pt.X + $W - 80) ($pt.Y + $H - 36)
    Start-Sleep -Milliseconds 900
    Write-Output 'SKIPCLICKED'
  }
  'cardbtn' {
    # 扫描覆盖层卡片按钮上下边框水平线(x∈[652,948])，点击第idx个按钮中心；idx=-1 仅探测
    $b, $path = Take-Shot ("{0:HHmmss}_card.png" -f (Get-Date))
    $rows = New-Object System.Collections.Generic.List[int]
    for ($y = [int]($H * 0.35); $y -lt $H - 10; $y++) {
      $hit = 0
      for ($x = 652; $x -le 948; $x += 2) {
        $p = $b.GetPixel($x, $y)
        if ([math]::Abs($p.R - 122) -le 45 -and $p.G -lt 70 -and $p.B -lt 80) { $hit++ }
      }
      if ($hit -ge 100) { $rows.Add($y) }
    }
    Close-Bmp $b
    $centers = @()
    foreach ($y in $rows) {
      if ($centers.Count -gt 0 -and ($y - $centers[-1][1]) -le 6) { $centers[-1][1] = $y; continue }
      $centers += ,@($y, $y)
    }
    $btns = @($centers | ForEach-Object { [int](($_[0] + $_[1]) / 2) } | Where-Object { $_ -gt 0 })
    Write-Output ("CARDBTNS " + ($btns -join ','))
    if ($idx -lt 0) { break }
    if ($idx -ge $btns.Count) { Write-Output 'CARD_OOB'; exit 3 }
    $by = $btns[$idx]
    foreach ($dy in @(0, -16, 16)) {
      [void][W32]::SwitchToThisWindow($h,$true); Start-Sleep -Milliseconds 120
      Real-Click ($pt.X + 800) ($pt.Y + $by + $dy)
      Start-Sleep -Milliseconds 700
      $after = Take-Shot ("{0:HHmmss}_after.png" -f (Get-Date)); Close-Bmp $after[0]
    }
    Write-Output ("CARDBTN CLICKED y={0}" -f $by)
  }
  'textclick' {
    # 点击叙事框中部跳过打字机（取 y = H*0.66 处，通常位于框内且避开选择堆）
    Real-Click ($pt.X + [int]($W*0.5)) ($pt.Y + [int]($H*0.62))
    Start-Sleep -Milliseconds 350
    Write-Output 'TEXTCLICKED'
  }
  'state' {
    $st = Save-State $null
    if ($st) { Write-Output ("STATE scene={0} hp={1} san={2} pts={3} weapon={4} dead={5}" -f $st.scene_id, $st.hp, $st.san, $st.points, $st.weapon, ($st.dead_team -join '+')) }
    else { Write-Output 'NO_SAVE' }
  }
  'rawclick' {
    Real-Click ($pt.X + [int]($W*[double]$a2)) ($pt.Y + [int]($H*[double]$a3))
    Write-Output ("RAWCLICKED {0},{1}" -f $a2, $a3)
  }
  'menu' {
    $b, $path = Take-Shot ("{0:HHmmss}_menu.png" -f (Get-Date))
    # 扫描水平长线：x∈[560,1040] 内 ≥220 像素匹配血红(#7a0e1c±tol)的行 = 按钮上/下边框
    $rows = @()
    for ($y = [int]($H*0.35); $y -lt $H-20; $y++) {
      $hit = 0
      for ($x = 560; $x -le 1040; $x += 2) {
        $p = $b.GetPixel($x, $y)
        if ([math]::Abs($p.R - 122) -le 34 -and [math]::Abs($p.G - 14) -le 30 -and [math]::Abs($p.B - 28) -le 34) { $hit++ }
      }
      if ($hit -ge 110) { $rows += $y }
    }
    Close-Bmp $b
    Write-Output ("ROWS n={0} sample={1}" -f $rows.Count, (($rows | Select-Object -First 8) -join ','))
    $clusters = @()
    foreach ($y in $rows) {
      if ($clusters.Count -gt 0 -and ($y - $clusters[-1][1]) -le 4) { $clusters[-1][1] = $y; continue }
      $clusters += ,@($y, $y)
    }
    Write-Output ("LINES " + (($clusters | ForEach-Object { "{0}-{1}" -f $_[0], $_[1] }) -join ' | '))
  }
  'hud' {
    $b, $path = Take-Shot ("{0:HHmmss}_hud.png" -f (Get-Date))
    # 顶部HUD体力条：y≈22..30, x≈60..180 应有 #a51220~#ff5566 渐变
    $red = 0
    for ($x = 50; $x -lt 190; $x += 4) {
      $p = $b.GetPixel($x, 26)
      if ($p.R -gt 130 -and $p.G -lt 110 -and $p.B -lt 110) { $red++ }
    }
    # 标题大字检测：y≈0.30H 中央应有血红大字
    $big = 0
    for ($x = 500; $x -lt 1100; $x += 10) {
      $p = $b.GetPixel($x, [int]($H*0.315))
      if ($p.R -gt 120 -and $p.G -lt 80 -and $p.B -lt 90) { $big++ }
    }
    Close-Bmp $b
    Write-Output ("HUD_RED={0} TITLE_BIG={1}" -f $red, $big)
  }
  'shot' {
    $b, $path = Take-Shot ("{0:HHmmss}_shot.png" -f (Get-Date))
    Close-Bmp $b
    Write-Output "SHOT $path"
  }
  'jsbtn' {
    # 确定式按钮驱动: 轮询按钮出现(打字机友好) -> 真实鼠标点击 -> 轮询save.json场景 -> 写last_result.json
    $resFile = Join-Path $PSScriptRoot 'last_result.json'
    $expr = "JSON.stringify([...document.querySelectorAll('#choices .choice, .menuBtns .mbtn, .ovCard .mbtn, #cineSkip')].filter(b=>b.offsetParent!==null).map(b=>{const r=b.getBoundingClientRect();return {t:(b.innerText||'').replace(/\s+/g,'').slice(0,44), x:(r.left+r.width/2), y:(r.top+r.height/2)}}))"
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $target = $null; $label = ''
    while ($sw.ElapsedMilliseconds -lt $timeoutMs) {
      $raw = & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'ws_eval.ps1') -Expr $expr 2>$null
      $jsonLine = ($raw | Where-Object { $_ -is [string] -and $_ -match '"id":1' }) | Select-Object -First 1
      if ($jsonLine) {
        $lastSeen = @($btns | ForEach-Object { $_.t }) -join '/'
        try {
          $outer = ($jsonLine | ConvertFrom-Json).result.result.value
          $btns = @($outer | ConvertFrom-Json)
          if ($btns.Count -gt 0) {
            if ($a1 -and $a1 -ne '-') {
              foreach ($b in $btns) { if ($b.t -like "*$a1*") { $target = $b; $label = $b.t; break } }
            } elseif ($idx -ge 0 -and $idx -lt $btns.Count) { $target = $btns[$idx]; $label = $target.t }
          }
        } catch {}
      }
      if ($target) { break }
      Start-Sleep -Milliseconds 400
    }
    if (-not $target) {
      $seen = ($lastSeen -join '/')
      @{ ok=$false; reason='no-button'; kw=$a1; seen=$seen } | ConvertTo-Json | Set-Content $resFile -Encoding UTF8
      Add-Content (Join-Path $PSScriptRoot 'artifacts\logs\steps.log') (" nobtn kw={0} seen=[{1}]" -f $a1, $seen)
      Write-Output 'JSBTN no-button'
      exit 4
    }
    $tx = [double](@($target.x)[0]); $ty = [double](@($target.y)[0])
    $null = & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'ws_click.ps1') -X $tx -Y $ty 2>$null
    $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
    $ok = $false; $sid = ''
    while ([DateTime]::UtcNow -lt $deadline) {
      Start-Sleep -Milliseconds 200
      $st = Save-State $null
      if ($st -and $st.scene_id) { $sid = $st.scene_id; if (-not $expect -or $sid -like "$expect*") { $ok = $true; break } }
    }
    @{ ok=$ok; scene=$sid; label=$label; kw=$a1 } | ConvertTo-Json | Set-Content $resFile -Encoding UTF8
    Write-Output ("JSBTN ok={0} scene={1} label={2}" -f $ok, $sid, $label)
    if (-not $ok) { exit 4 }
  }
}