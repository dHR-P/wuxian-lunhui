$ErrorActionPreference = 'Stop'
$apiKey = 'sk_tr_kHjpemePYfJLpsejXmebJsJH8kQHnz-vmXp5JoqG9AQ'
$uri = 'https://tokenrhythm.studio/v1/chat/completions'
$base = 'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design'

$targets = @(
  @{
    id       = 'A_raw'
    label    = 'A_raw_raw_enemy_pc_zhengzha_c6 (original 768x1024 black bg)'
    path     = "$base\raw_enemy\pc_zhengzha_c6.png"
    promptF  = "$base\qc_prompt_A.txt"
  },
  @{
    id       = 'B_cutout'
    label    = 'B_cutout_pc_zhengzha (transparent PNG)'
    path     = "$base\..\..\server-rs\ui\assets\img\pc_zhengzha.png"
    promptF  = "$base\qc_prompt_B.txt"
  },
  @{
    id       = 'C_preview'
    label    = 'C_preview_enemy_pc_zhengzha (checkerboard composite)'
    path     = "$base\preview_enemy\preview_enemy_pc_zhengzha.png"
    promptF  = "$base\qc_prompt_C.txt"
  }
)

function Send-QA {
  param([string]$label, [string]$path, [string]$prompt, [string]$outJson)
  $b = [IO.File]::ReadAllBytes($path)
  $b64 = [Convert]::ToBase64String($b)
  $dataUrl = 'data:image/png;base64,' + $b64
  $bodyObj = @{
    model = 'qwen3.7-flash'
    messages = @(
      @{
        role = 'system'
        content = 'You are a meticulous game-art QA inspector. Look at the image carefully, then output a concise structured verdict. Keep your internal reasoning brief; the final answer must be in your "content". Always finish with an explicit final verdict line.'
      },
      @{
        role = 'user'
        content = @(
          @{ type = 'text'; text = $prompt },
          @{ type = 'image_url'; image_url = @{ url = $dataUrl } }
        )
      }
    )
    max_tokens = 4000
  }
  $json = [Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Depth 10 -Compress))

  $attempt = 0
  while ($true) {
    $attempt++
    try {
      $resp = Invoke-RestMethod -Uri $uri -Method Post -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json; charset=utf-8' } -Body $json -TimeoutSec 240
      ($resp | ConvertTo-Json -Depth 20) | Set-Content -Path $outJson -Encoding UTF8
      $c = [string]$resp.choices[0].message.content
      if ([string]::IsNullOrWhiteSpace($c)) { $c = [string]$resp.choices[0].message.reasoning_content }
      if ([string]::IsNullOrWhiteSpace($c)) { $c = '(empty response)' }
      return $c
    } catch {
      $code = $null
      try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch { $code = -1 }
      $msg = $_.Exception.Message
      Write-Output "[$label] attempt $attempt failed (code=$code): $msg"
      $retryable = ($code -eq 429) -or ($code -eq 500) -or ($code -eq 503) -or ($msg -match 'timed out|timeout|operation has timed')
      if ($attempt -lt 6 -and $retryable) {
        $wait = 5
        try { $rl = $_.ErrorDetails.Message | ConvertFrom-Json; $wait = [int]$rl.data.retryAfterSeconds } catch {}
        if ($wait -lt 1) { $wait = 5 }
        Write-Output "[$label] backing off $wait s before retry $($attempt+1)..."
        Start-Sleep -Seconds $wait
        continue
      }
      return "ERROR after $attempt attempt(s) (code=$code): $msg"
    }
  }
}

$summary = @()
foreach ($t in $targets) {
  $prompt = [IO.File]::ReadAllText($t.promptF, [Text.Encoding]::UTF8)
  $outJson = Join-Path $base ("qc_resp_" + $t.id + ".json")
  $outMd   = Join-Path $base ("qc_result_" + $t.id + ".md")
  Write-Output "=== $($t.label) ==="
  $content = Send-QA -label $t.id -path $t.path -prompt $prompt -outJson $outJson
  Set-Content -Path $outMd -Value $content -Encoding UTF8
  $snippet = if ($content.Length -gt 500) { $content.Substring(0,500) } else { $content }
  Write-Output $snippet
  Write-Output "---"
  $summary += "$($t.id): " + $content.Substring(0, [Math]::Min(200, $content.Length))
}
Write-Output '=====SUMMARY====='
$summary | ForEach-Object { Write-Output $_ }
Write-Output '=====ALLDONE====='