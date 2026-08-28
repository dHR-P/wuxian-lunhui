# -*- coding: utf-8 -*-
# Cut pure-solid-color background out of AI-generated enemy sprites -> transparent PNG.
# Algorithm: distance to known background color C0; alpha = d<=3 ? 0 : min(255,(d-3)*16)
#   (d=3 -> 0, d>=19 -> fully opaque; preserves dark red flesh / dark clothing details)
# Usage: pwsh -File cutout_enemy.ps1
# Inputs:  tools/design/raw_enemy/<id>.png (768x1024, pure black OR pure white bg)
# Outputs: server-rs/ui/assets/img/enemy_<id>.png (32bppArgb)
param(
  [string]$RawDir = "tools/design/raw_enemy",
  [string]$OutDir = "server-rs/ui/assets/img"
)
Add-Type -AssemblyName System.Drawing
$Items = @(
  @{ id = "zombie"; bg = @(0, 0, 0) },
  @{ id = "licker"; bg = @(255, 255, 255) },
  @{ id = "hunter"; bg = @(0, 0, 0) },
  @{ id = "guard";  bg = @(0, 0, 0) },
  @{ id = "horde";  bg = @(255, 255, 255) }
)
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
foreach ($it in $Items) {
  $id = $it.id
  $src = Join-Path $RawDir "$id.png"
  $dst = Join-Path $OutDir "enemy_$id.png"
  if (-not (Test-Path $src)) { Write-Warning "skip missing $src"; continue }
  $srcBmp = [System.Drawing.Bitmap]::new($src)
  $W = $srcBmp.Width; $H = $srcBmp.Height
  # 新建 32bppArgb 目标位图承载 alpha（LockBits 视图不会改变源位图格式，直接 Save 会丢 alpha）
  $bmp = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $rect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
  $srcData = $srcBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $dstData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $sStride = $srcData.Stride; $dStride = $dstData.Stride
  $sBytes = New-Object byte[] ($sStride * $H)
  $dBytes = New-Object byte[] ($dStride * $H)
  [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $sBytes, 0, $sBytes.Length)
  $b0 = [double]$it.bg[0]; $g0 = [double]$it.bg[1]; $r0 = [double]$it.bg[2]
  for ($y = 0; $y -lt $H; $y++) {
    $sr = $y * $sStride; $dr = $y * $dStride
    for ($x = 0; $x -lt $W; $x++) {
      $si = $sr + $x * 3
      $di = $dr + $x * 4
      $b = [double]$sBytes[$si]; $g = [double]$sBytes[$si + 1]; $r = [double]$sBytes[$si + 2]
      $dbr = $r - $r0; $dbg = $g - $g0; $dbb = $b - $b0
      $d = [math]::Sqrt($dbr * $dbr + $dbg * $dbg + $dbb * $dbb)
      $a = 0
      if ($d -gt 3.0) { $a = [int][math]::Min(255.0, ($d - 3.0) * 16.0) }
      $dBytes[$di] = [byte]$b; $dBytes[$di + 1] = [byte]$g; $dBytes[$di + 2] = [byte]$r
      $dBytes[$di + 3] = [byte]$a
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($dBytes, 0, $dstData.Scan0, $dBytes.Length)
  $srcBmp.UnlockBits($srcData)
  $bmp.UnlockBits($dstData)
  $srcBmp.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "OK $id -> $dst"
}
