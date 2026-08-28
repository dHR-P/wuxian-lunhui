param(
  [string]$Tag,
  [string]$Path,
  [string]$Prompt
)

$ErrorActionPreference = 'Stop'

$yaml = Get-Content C:\Users\GWL\.dsh\.credentials.yaml -Raw
$key = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"''\r\n]+)').Groups[1].Value
if (-not $key) { Write-Output 'NO_KEY'; exit 2 }

$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Path))
$dataUrl = 'data:image/png;base64,' + $img

$payload = @{
  model = 'qwen3.7-flash'
  messages = @(
    @{ role='user'; content=@(
        @{type='text'; text=$Prompt},
        @{type='image_url'; image_url=@{url=$dataUrl}}
    )}
  )
  max_tokens = 4000
} | ConvertTo-Json -Depth 8

$bodyFile = "$env:TEMP\tk_body_$Tag.json"
$payload | Out-File -Encoding utf8 $bodyFile

$last = $null
for ($i=1; $i -le 5; $i++) {
  $res = & curl.exe -s -X POST 'https://tokenrhythm.studio/v1/chat/completions' -H "Authorization: Bearer $key" -H 'Content-Type: application/json' --data-binary "@$bodyFile"
  $last = $res
  if ($res -match '"429"' -or $res -match 'rate_limit|RateLimit|too many|Too Many') {
    Write-Output "RETRY_$i RATELIMIT"
    Start-Sleep -Seconds 15
    continue
  }
  break
}

if (-not $last) { Write-Output 'EMPTY_RESPONSE'; exit 3 }

try {
  $json = $last | ConvertFrom-Json
  if ($json.choices -and $json.choices[0].message.content) {
    $content = $json.choices[0].message.content
    $outFile = "$env:TEMP\tk_out_$Tag.txt"
    [System.IO.File]::WriteAllText($outFile, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "OK"
  } else {
    Write-Output "NO_CONTENT: $last"
  }
} catch {
  Write-Output "PARSE_FAIL: $last"
}