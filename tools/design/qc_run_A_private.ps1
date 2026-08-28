$ErrorActionPreference = 'Stop'
$apiKey = 'sk_tr_kHjpemePYfJLpsejXmebJsJH8kQHnz-vmXp5JoqG9AQ'
$uri = 'https://tokenrhythm.studio/v1/chat/completions'
$base = 'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design'

$prompt = [IO.File]::ReadAllText("$base\qc_prompt_A_private.txt", [Text.Encoding]::UTF8)
$path   = "$base\raw_enemy\pc_zhengzha_c6.png"

$b = [IO.File]::ReadAllBytes($path)
$dataUrl = 'data:image/png;base64,' + [Convert]::ToBase64String($b)
$bodyObj = @{
  model = 'qwen3.7-flash'
  messages = @(
    @{ role='system'; content='You are a meticulous game-art QA inspector. Look at the image, evaluate the 7 points, and output a concise structured verdict in your "content" field. Keep reasoning brief.' },
    @{ role='user'; content=@( @{type='text'; text=$prompt}, @{type='image_url'; image_url=@{url=$dataUrl}} ) }
  )
  max_tokens = 4000
}
$json = [Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Depth 10 -Compress))

$attempt = 0
while ($true) {
  $attempt++
  try {
    $resp = Invoke-RestMethod -Uri $uri -Method Post -Headers @{ Authorization="Bearer $apiKey"; 'Content-Type'='application/json; charset=utf-8' } -Body $json -TimeoutSec 240
    ($resp | ConvertTo-Json -Depth 20) | Set-Content -Path "$base\qc_resp_A_private.json" -Encoding UTF8
    $c = [string]$resp.choices[0].message.content
    if ([string]::IsNullOrWhiteSpace($c)) { $c = [string]$resp.choices[0].message.reasoning_content }
    if ([string]::IsNullOrWhiteSpace($c)) { $c = '(empty response)' }
    Set-Content -Path "$base\qc_result_A_private.md" -Value $c -Encoding UTF8
    Write-Output $c
    break
  } catch {
    $code = $null
    try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch { $code = -1 }
    $msg = $_.Exception.Message
    Write-Output "attempt $attempt (code=$code): $msg"
    $retryable = ($code -eq 429) -or ($code -eq 500) -or ($code -eq 503)
    if ($attempt -lt 6 -and $retryable) {
      $wait = 20
      try { $rl=$_.ErrorDetails.Message|ConvertFrom-Json; $wait=[int]$rl.data.retryAfterSeconds } catch {}
      if ($wait -lt 5) { $wait = 20 }
      Start-Sleep -Seconds $wait
      continue
    }
    Write-Output "ERROR_FAILED"
    break
  }
}
Write-Output '=====A_PRIVATE_DONE====='