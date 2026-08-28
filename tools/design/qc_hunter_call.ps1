$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# --- API 配置 ---
$credRaw = Get-Content 'C:\Users\GWL\.dsh\.credentials.yaml' -Raw
$key = [regex]::Match($credRaw, 'TOKENRHYTHM_API_KEY:\s*(\S+)').Groups[1].Value
if (-not $key) { throw 'TOKENRHYTHM_API_KEY not found in credentials yaml' }
$uri = 'https://tokenrhythm.studio/v1/chat/completions'
$headers = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }
$model = 'tokenrhythm/qwen3.7-flash'

# --- 通用调用:429/超时 退避 5s 重试最多 3 次 ---
function Invoke-QC([string]$prompt, [string[]]$imagePaths, [string]$label, [string]$outFile) {
    Write-Output "`n===== $label ====="
    $content = @(@{ type = 'text'; text = $prompt })
    foreach ($p in $imagePaths) {
        $bytes = [IO.File]::ReadAllBytes($p)
        $b64 = [Convert]::ToBase64String($bytes)
        $content += @{ type = 'image_url'; image_url = @{ url = "data:image/png;base64,$b64" } }
        Write-Output ("  attached image: {0} ({1} bytes -> {2} b64 chars)" -f $p, $bytes.Length, $b64.Length)
    }
    $body = @{
        model      = $model
        messages   = @(@{ role = 'user'; content = $content })
        max_tokens = 1500
    } | ConvertTo-Json -Depth 20

    $attempt = 0
    while ($true) {
        $attempt++
        try {
            $resp = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body -TimeoutSec 240
            $txt = $resp.choices[0].message.content
            if ($txt -is [array]) { $txt = ($txt | ForEach-Object { $_.text }) -join "`n" }
            Write-Output "--- success on attempt $attempt ---"
            Write-Output $txt
            if ($outFile) { $txt | Set-Content -Path $outFile -Encoding utf8 }
            return $txt
        } catch {
            $code = $null
            if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
            $isTimeout = $_.Exception.Message -match 'timed out|timeout|terminated'
            Write-Output "attempt $attempt failed [$label]: HTTP=$code :: $($_.Exception.Message)"
            if ($attempt -ge 4) { Write-Output "GAVE UP after 4 attempts: $label"; return $null }
            if ($code -eq 429 -or $isTimeout) { Write-Output '  -> backing off 5s'; Start-Sleep -Seconds 5; continue }
            Write-Output "NON-RETRYABLE error, stopping: $label"; return $null
        }
    }
}

$dir = 'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design'
$imgA = "$dir\raw_enemy\hunter.png"
$imgB = 'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img\enemy_hunter.png'
$imgC = "$dir\preview_enemy\preview_enemy_hunter.png"

# 提示词从 UTF-8 文本文件显式读取(避免 .ps1 本身的编码问题)
$promptA  = (Get-Content -Raw -Encoding utf8 "$dir\qc_prompt_A.txt").Trim()
$promptBC = (Get-Content -Raw -Encoding utf8 "$dir\qc_prompt_BC.txt").Trim()

$r1 = Invoke-QC -prompt $promptA -imagePaths @($imgA) -label 'A: raw design QA (hunter.png)' -outFile "$env:TEMP\qc_hunter_resp_A.txt"
$r2 = Invoke-QC -prompt $promptBC -imagePaths @($imgB, $imgC) -label 'B+C: cutout QA (enemy_hunter.png + preview)' -outFile "$env:TEMP\qc_hunter_resp_BC.txt"

Write-Output "`n===== DONE: A=$($null -ne $r1) BC=$($null -ne $r2) ====="