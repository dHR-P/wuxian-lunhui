param([string]$action,[string]$a1,[object]$a2,[object]$a3)
$ErrorActionPreference = 'Stop'
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
[void][W32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 200

$r = New-Object W32+RECT
[void][W32]::GetClientRect($h, [ref]$r)
$pt = New-Object W32+PT; $pt.X = 0; $pt.Y = 0
[void][W32]::ClientToScreen($h, [ref]$pt)
$w = $r.R; $hh = $r.B

if ($action -eq 'shot') {
  $bmp = New-Object System.Drawing.Bitmap($w, $hh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($pt.X, $pt.Y, 0, 0, (New-Object System.Drawing.Size($w, $hh)))
  $bmp.Save($a1, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("SAVED {0} SIZE {1}x{2}" -f $a1, $w, $hh)
}
elseif ($action -eq 'click') {
  $rx = [double]$a2; $ry = [double]$a3
  $x = [int]($pt.X + $rx * $w)
  $y = [int]($pt.Y + $ry * $hh)
  [void][W32]::SetCursorPos($x, $y)
  Start-Sleep -Milliseconds 90
  [W32]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [W32]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
  Write-Output ("CLICKED {0},{1} client {2}x{3}" -f $x, $y, $w, $hh)
}
else { throw "unknown action" }
