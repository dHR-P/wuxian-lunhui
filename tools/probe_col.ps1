param([int]$x = 800, [int]$y0 = 430, [int]$y1 = 720)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct PT { public int X,Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref PT p);
}
"@
[void][WP]::SetProcessDPIAware()
$p = Get-Process wuxian-horror-ch1 | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$r = New-Object WP+RECT
[void][WP]::GetClientRect($p.MainWindowHandle, [ref]$r)
$pt = New-Object WP+PT
[void][WP]::ClientToScreen($p.MainWindowHandle, [ref]$pt)
$bmp = New-Object System.Drawing.Bitmap($r.R, $r.B)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($pt.X, $pt.Y, 0, 0, (New-Object System.Drawing.Size($r.R, $r.B)))
for ($y = $y0; $y -le $y1; $y += 6) {
  $px = $bmp.GetPixel($x, $y)
  Write-Output ("y={0} #{1:X2}{2:X2}{3:X2}" -f $y, $px.R, $px.G, $px.B)
}
$bmp.Save("C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\shots\col_dump.png")
$g.Dispose(); $bmp.Dispose()
Write-Output "DUMPED col x=$x"
