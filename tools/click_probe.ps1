param([int]$cx = 800, [int]$cy = 655)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WC {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern void SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool a);
}
"@
[void][WC]::SetProcessDPIAware()
$p = Get-Process wuxian-horror-ch1 | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
[void][WC]::SwitchToThisWindow($p.MainWindowHandle, $true)
Start-Sleep -Milliseconds 300

function Shot-Avg {
  $b = New-Object System.Drawing.Bitmap(1600, 1025)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size(1600, 1025)))
  $s = [long]0
  for ($x = 100; $x -lt 1500; $x += 25) { $px = $b.GetPixel($x, 512); $s += ([int]$px.R + $px.G + $px.B) }
  $g.Dispose(); $b.Dispose(); return $s
}
$before = Shot-Avg
Write-Output ("BEFORE {0}" -f $before)
[void][WC]::SetCursorPos($cx, $cy)
Start-Sleep -Milliseconds 150
[WC]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 80
[WC]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 900
$after = Shot-Avg
Write-Output ("AFTER {0} delta={1}" -f $after, ($after - $before))
