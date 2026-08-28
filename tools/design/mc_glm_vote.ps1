param(
  [string]$Tag,
  [string]$Path
)
$ErrorActionPreference = 'Stop'

# API key from credentials
$yaml = Get-Content C:\Users\GWL\.dsh\.credentials.yaml -Raw
$key = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"''\r\n]+)').Groups[1].Value
if (-not $key) { Write-Output 'NO_KEY'; exit 2 }

# Resize image to max 1024 on long side to bound payload
Add-Type -AssemblyName System.Drawing
$srcBmp = [System.Drawing.Bitmap]::FromFile($Path)
$maxSide = 1024
$w = $srcBmp.Width; $h = $srcBmp.Height
$scale = [Math]::Min(1.0, $maxSide / [Math]::Max($w, $h))
$nw = [int][Math]::Round($w * $scale); $nh = [int][Math]::Round($h * $scale)

$outImg = New-Object System.Drawing.Bitmap $nw, $nh
$g = [System.Drawing.Graphics]::FromImage($outImg)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($srcBmp, 0, 0, $nw, $nh)
$g.Dispose(); $srcBmp.Dispose()

$ms = New-Object System.IO.MemoryStream
$outImg.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$outImg.Dispose()
$img = [Convert]::ToBase64String($ms.ToArray())
$ms.Dispose()
$dataUrl = 'data:image/png;base64,' + $img

$sysText = 'You are a visual evaluator. A screenshot of a 3D battle from a game is provided. Score 5 dimensions (each 1-5) and give a description plus a verdict yes/no on whether the character matches Minecraft voxel-block proportions.\n\nMC block-person baseline (Steve/Alex): head 8x8x8px cube (tall, about 1/3 of body height), rectangular box torso, limbs are thin rectangles (4 wide x 12 long), total block-built silhouette, no circular/cylindrical/spherical joints, no organic curves, pixelated blocky surface texture.\n\nDimensions:\nD1 volume: does the character have box/block thickness or is it a flat billboard/paper-cutout.\nD2 proportion: do head/torso/limbs relative sizes approach MC 1.8-block layout (big head + thin rectangular limbs).\nD3 view distance: is the character close/large enough to see block structure, or a small distant figure/silhouette.\nD4 shading/depth: is there Lambert lighting and per-face brightness differences on the block faces.\nD5 recognizability: can you see distinct block segments for head/torso/limbs.\n\nSingle verdict yes if total >= 18/25. Any critical veto (head too small, limbs round not rectangular, fully flat/no depth, too far to see structure) forces no.\n\nOutput ONLY a single line of JSON with exactly these keys (proper JSON with quotes): desc (text), D1 D2 D3 D4 D5 (integers 1-5), verdict (yes or no), reason (text).'

$escData = $dataUrl
$jsonBody = @"
{"model":"glm-5.3-flash","messages":[{"role":"system","content":"$sysText"},{"role":"user","content":[{"type":"text","text":"Please evaluate this battle screenshot."},{"type":"image_url","image_url":{"url":"$escData"}}]}],"temperature":0,"max_tokens":2500}
"@

$bodyFile = "$env:TEMP\mc_body_$Tag.json"
[System.IO.File]::WriteAllText($bodyFile, $jsonBody, (New-Object System.Text.UTF8Encoding($false)))

$resp = $null
for ($i=1; $i -le 5; $i++) {
  $r = & curl.exe -s -X POST 'https://tokenrhythm.studio/v1/chat/completions' -H "Authorization: Bearer $key" -H 'Content-Type: application/json' --data-binary "@$bodyFile"
  $resp = $r
  if ($r -match '"429"' -or $r -match 'rate_limit|RateLimit|too many|Too Many|MODEL_NOT_AVAILABLE') {
    $snip = $r; if ($r.Length -gt 80) { $snip = $r.Substring(0,80) }
    Write-Output "RETRY_$i $snip"
    Start-Sleep -Seconds 15
    continue
  }
  break
}

if (-not $resp) { Write-Output 'EMPTY_RESPONSE'; exit 3 }

$rawFile = "$env:TEMP\mc_raw_$Tag.txt"
[System.IO.File]::WriteAllText($rawFile, $resp, (New-Object System.Text.UTF8Encoding($false)))
$content = $resp
$m = [regex]::Match($resp, '"content"\s*:\s*"((?:[^"\\]|\\.)*)"')
if ($m.Success) {
  $content = $m.Groups[1].Value
  $content = $content -replace '\\u003c', '<' -replace '\\u003e', '>' -replace '\\\\n', "`n" -replace '\\n', "`n"
}
$outFile = "$env:TEMP\mc_out_$Tag.txt"
[System.IO.File]::WriteAllText($outFile, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "OK"