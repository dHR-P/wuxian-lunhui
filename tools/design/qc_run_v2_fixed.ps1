$ErrorActionPreference = 'Stop'
$base = 'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design'
$tmpBody = Join-Path $env:TEMP 'tk_qc_body.json'

$yaml = Get-Content 'C:\Users\GWL\.dsh\.credentials.yaml' -Raw
$apikey = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"''\r\n]+)').Groups[1].Value
if ([string]::IsNullOrWhiteSpace($apikey)) { Write-Output 'NO_KEY'; exit 1 }
Write-Output "key ok: len=$($apikey.Length)"

$targets = @(
  @{ id='A_raw';   path="$base\raw_enemy\pc_zhengzha_c6.png"; prompt="$base\qc_prompt_A_private_fixed.txt" },
  @{ id='B_cutout'; path="$base\..\..\server-rs\ui\assets\img\pc_zhengzha.png"; prompt="$base\qc_prompt_B_private_fixed.txt" },
  @{ id='C_preview'; path="$base\preview_enemy\preview_enemy_pc_zhengzha.png"; prompt="$base\qc_prompt_C_private_fixed.txt" }
)

function Invoke-QA([string]$tId, [string]$imgPath, [string]$txtPath, [string]$outMd, [string]$outJson) {
  $text = [IO.File]::ReadAllText($txtPath, [Text.Encoding]::UTF8)
  $img  = [Convert]::ToBase64String([IO.File]::ReadAllBytes($imgPath))
  $dataUrl = 'data:image/png;base64,' + $img
  $payload = @{ model='qwen3.7-flash'; messages=@(@{ role='user'; content=@(@{type='text';text=$text}, @{type='image_url';image_url=@{url=$dataUrl}} ) }); max_tokens=3000 } | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($tmpBody, $payload, (New-Object System.Text.UTF8Encoding($false)))

  $attempt = 0
  $tmpResp = Join-Path $env:TEMP ('tk_qc_resp_' + [guid]::NewGuid().ToString('N') + '.txt')
  while ($true) {
    $attempt++
    $httpCode = & curl.exe -s -o "$tmpResp" -w "%{http_code}" -X POST 'https://tokenrhythm.studio/v1/chat/completions' -H "Authorization: Bearer $apikey" -H 'Content-Type: application/json' --data-binary "@$tmpBody"
    $code = 0
    [int]::TryParse($httpCode, [ref]$code) | Out-Null
    $body = if (Test-Path $tmpResp) { [IO.File]::ReadAllText($tmpResp, [Text.Encoding]::UTF8) } else { '' }
    if ($code -eq 200) {
      try {
        $obj = $body | ConvertFrom-Json
        [IO.File]::WriteAllText($outJson, $body, (New-Object System.Text.UTF8Encoding($false)))
        $contentField = [string]$obj.choices[0].message.content
        if ([string]::IsNullOrWhiteSpace($contentField)) { $contentField = [string]$obj.choices[0].message.reasoning_content }
        if ([string]::IsNullOrWhiteSpace($contentField)) { $contentField = '(empty response)' }
        # write UTF-8 no BOM
        [IO.File]::WriteAllText($outMd, $contentField, (New-Object System.Text.UTF8Encoding($false)))
        Write-Output "[$tId] HTTP 200 OK"
        Write-Output '-----'
        Write-Output $contentField
        Write-Output '-----'
      } catch {
        $errText = "PARSE_ERROR after HTTP 200: $($_.Exception.Message)"
        [IO.File]::WriteAllText($outMd, $errText, (New-Object System.Text.UTF8Encoding($false)))
        Write-Output "[$tId] $errText"
      }
      if (Test-Path $tmpResp) { Remove-Item $tmpResp -Force }
      return
    }
    # non-200
    $msgMatch = ''
    if ($body) { $m=[regex]::Match($body, '"message"\s*:\s*"([^"]*)"'); if ($m.Success) { $msgMatch = $m.Groups[1].Value } }
    Write-Output "[$tId] attempt $attempt status=$code msg=$msgMatch"
    if ($code -eq 429 -and $attempt -lt 5) {
      Write-Output "[$tId] rate limited, backing off 15s before retry $($attempt+1)..."
      Start-Sleep -Seconds 15
      continue
    }
    $errText = "ERROR: HTTP $code $msgMatch after $attempt attempt(s)"
    [IO.File]::WriteAllText($outMd, $errText, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "[$tId] $errText"
    if (Test-Path $tmpResp) { Remove-Item $tmpResp -Force }
    return
  }
}

foreach ($t in $targets) {
  $outMd = Join-Path $base ("qc_result_" + $t.id + ".md")
  $outJson = Join-Path $base ("qc_resp_" + $t.id + "_v2.json")
  Write-Output "===== $($t.id) ====="
  Invoke-QA -tId $t.id -imgPath $t.path -txtPath $t.prompt -outMd $outMd -outJson $outJson
  Write-Output ""
}
Write-Output '=====ALLDONE====='