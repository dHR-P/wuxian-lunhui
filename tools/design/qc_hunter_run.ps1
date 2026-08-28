$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ---------- helpers ----------
function Get-U8([string]$p){ [System.IO.File]::ReadAllText($p, (New-Object System.Text.UTF8Encoding($false))) }
function Set-U8([string]$p,[string]$c){ [System.IO.File]::WriteAllText($p, $c, (New-Object System.Text.UTF8Encoding($false))) }

# ---------- api ----------
$yaml = Get-Content C:\Users\GWL\.dsh\.credentials.yaml -Raw
$key  = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"'']+)').Groups[1].Value
$headers = @{ Authorization="Bearer $key"; 'Content-Type'='application/json' }
$uri = 'https://tokenrhythm.studio/v1/chat/completions'

function Invoke-QC([string]$label,[string]$prompt,[string[]]$imagePaths){
    $content = @(@{type='text';text=$prompt})
    foreach($p in $imagePaths){
        $img=[Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
        $content += @{type='image_url';image_url=@{url=('data:image/png;base64,'+$img)}}
    }
    $attempt=0
    while($true){
        $attempt++
        $body = @{ model='qwen3.7-flash'; messages=@(@{role='user';content=$content}); max_tokens=3000 } | ConvertTo-Json -Depth 8
        $byteBody=[System.Text.Encoding]::UTF8.GetBytes($body)
        try{
            $r = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $byteBody -TimeoutSec 240
            $m=$r.choices[0].message
            $txt=$m.content
            if([string]::IsNullOrWhiteSpace($txt)){ $txt=$m.reasoning_content }
            Write-Output "  -> $label success on attempt $attempt"
            return $txt
        }catch{
            $code=$null
            if($_.Exception.Response -and $_.Exception.Response.StatusCode){ $code=[int]$_.Exception.Response.StatusCode }
            $isTimeout = $_.Exception.Message -match 'timed out|timeout|terminated'
            $detail=''
            if($_.ErrorDetails.Message){ $detail=$_.ErrorDetails.Message }
            Write-Output "  -> $label attempt $attempt FAILED HTTP=$code msg=$($_.Exception.Message) detail=$detail"
            if($attempt -ge 5){
                Write-Output "  -> $label GAVE UP after 5 attempts"
                return "QC_ERROR_$label`: $($_.Exception.Message) $detail"
            }
            if($code -eq 429 -or $isTimeout){ Write-Output '  backoff 15s'; Start-Sleep -Seconds 15; continue }
            Write-Output '  non-retryable, stop this image'
            return "QC_ERROR_$label`: $($_.Exception.Message) $detail"
        }
    }
}

$dir='C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design'
$imgA="$dir\raw_enemy\hunter.png"
$imgB='C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img\enemy_hunter.png'
$imgC="$dir\preview_enemy\preview_enemy_hunter.png"

$pA  = Get-U8 "$dir\qc_prompt_A.txt"
$pBC = Get-U8 "$dir\qc_prompt_BC.txt"

$ctx = @"
=== QA context ===
Monster: "Hunter (discerners in Resident Evil) from 无限恐怖". Skinned muscle monster: broad shoulders, thick chest, sealed solid trunk, prominent muscle volume, slightly crouched threatening pose, exposed white bone spikes, may lack tail, full-body stance.
"@

# --- A: raw design ---
$pa = $pA
$rA = Invoke-QC -label 'A_raw' -prompt $pa -imagePaths @($imgA)
if(-not $rA){ $rA='<NO_RESPONSE>' }
$mdA = "<!-- A: $imgA size=284469 -->`n# A. raw enemy_hunter (原始立绘 造型质检)`n`n$ctx`n`n## raw response`n`n$rA`n"
Set-U8 "$dir\qc_result_A_raw.md" $mdA

# --- B: cutout ---
$pb = "重点关注抠图成品的透明背景抠图质量。提示词:`n`n$pBC"
$rB = Invoke-QC -label 'B_cutout' -prompt $pBC -imagePaths @($imgB)
if(-not $rB){ $rB='<NO_RESPONSE>' }
$mdB = "# B. cutout enemy_hunter (抠图成品 透明背景)`n`n$ctx`n`n## raw response`n`n$rB`n"
Set-U8 "$dir\qc_result_B_cutout.md" $mdB

# --- C: preview ---
$rC = Invoke-QC -label 'C_preview' -prompt $pBC -imagePaths @($imgC)
if(-not $rC){ $rC='<NO_RESPONSE>' }
$mdC = "# C. preview_enemy_hunter (棋盘格合成预览 384x512)`n`n$ctx`n`n## raw response`n`n$rC`n"
Set-U8 "$dir\qc_result_C_preview.md" $mdC

Write-Output "DONE all three."
Write-Output "A=" + $rA
Write-Output "B=" + $rB
Write-Output "C=" + $rC