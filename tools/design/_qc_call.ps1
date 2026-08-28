param($Path, $InstrFile)
$ErrorActionPreference = 'Stop'
$ut8 = New-Object System.Text.UTF8Encoding($false)
$uid = [guid]::NewGuid().ToString('N').Substring(0,8)
$body1 = "$env:TEMP\tk_body_qc_$uid.json"
$body2 = "$env:TEMP\tk_body_qc2_$uid.json"
$yaml = [System.IO.File]::ReadAllText('C:\Users\GWL\.dsh\.credentials.yaml', [System.Text.Encoding]::UTF8)
$key = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"''\r\n]+)').Groups[1].Value
if ([string]::IsNullOrEmpty($key)) { Write-Output 'ERROR_NO_KEY'; exit 1 }
$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Path))
$dataUrl = 'data:image/png;base64,' + $img
$instr = [System.IO.File]::ReadAllText($InstrFile, [System.Text.Encoding]::UTF8)

function Invoke-QC([string]$qi, [int]$maxtok, [string]$bodyPath) {
  $payload = @{ model='qwen3.7-flash'; messages=@(@{ role='user'; content=@(@{type='text';text=$qi},@{type='image_url';image_url=@{url=$dataUrl}}) }); max_tokens=$maxtok } | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($bodyPath, $payload, $ut8)
  return & curl.exe -s -X POST 'https://tokenrhythm.studio/v1/chat/completions' -H "Authorization: Bearer $key" -H 'Content-Type: application/json' --data-binary "@$bodyPath"
}

$res = ''
$attempt = 1
do {
  $res = Invoke-QC $instr 3000 $body1
  if ($res -match '"code"\s*:\s*"RATE_LIMIT|429' -and $attempt -lt 5) { Start-Sleep -Seconds 15; $attempt++; continue }
  break
} while ($attempt -le 5)

$content = [regex]::Match($res, '"content"\s*:\s*"((?:[^"\\]|\\.)*)"', 'Singleline').Groups[1].Value
if ([string]::IsNullOrEmpty($content)) {
  $res2 = Invoke-QC $instr 5000 $body2
  $content = [regex]::Match($res2, '"content"\s*:\s*"((?:[^"\\]|\\.)*)"', 'Singleline').Groups[1].Value
  $res = $res2
}
if ([string]::IsNullOrEmpty($content)) {
  $raw = "$env:TEMP\tk_raw_qc.txt"
  [System.IO.File]::WriteAllText($raw, $res, $ut8)
  $content = "RAW_FALLBACK_AT:$raw`n$res"
}
$content = $content -replace '\\n', "`n" -replace '\\"', '"' -replace '\\\\', '\'
Write-Output $content