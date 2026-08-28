# qwen3.7-flash 视觉质检脚本 - 郑吒立绘 pc_c11
# 逐图调用 tokenrhythm API，每张独立写结果 JSON
param(
  [Parameter(Mandatory=$false)][string]$Num
)

$ErrorActionPreference = 'Stop'
$outdir = "C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_out"
New-Item -ItemType Directory -Force -Path $outdir | Out-Null

$yaml = Get-Content "C:\Users\GWL\.dsh\.credentials.yaml" -Raw
$key = [regex]::Match($yaml, 'TOKENRHYTHM_API_KEY:\s*["'']?([^"''\r\n]+)').Groups[1].Value
if (-not $key) { throw "API key not found" }

$targets = @(
  @{
    id = 'A';
    path = "C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\pc_zhengzha_c11.png";
    prompt = @'
你是一名资深游戏美术素材质检员(QA)。请检查下面这张【原始立绘】图片。

角色设定:《无限恐怖》主角郑吒——亚洲青年男性约25岁、黑色短发、深灰蓝色紧身T恤、深色战术长裤、战术腰带、双臂自然下垂、笔直站立全身像,人物轮廓带冷白 rim light。此立绘背景为纯黑。

请逐项核对并给出明确判断:
1. 是否完整全身:头顶到脚是否都可见,脚掌/脚踝是否完整,画面下方是否只留少量黑色(没有把脚截掉)。
2. 姿态/头身比是否正常:有没有头过大、腿过短、身体比例失衡。
3. 衣物与背景是否有区分:深色衣物在纯黑背景上是否能靠冷白 rim light 识别轮廓,有没有糊成一片黑块。
4. 手部:手指/手掌有没有明显畸变、多指、断指。
5. 背景:是否干净,有无多余的泛光、噪点、光斑。

最后输出格式:
verdict: 合格 / 需微调 / 需重生成
如果合格,简要说明通过理由。
如果需微调或需重生成,明确列出每个问题点(粒度到部位)。
请用中文。
'@
  },
  @{
    id = 'B';
    path = "C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img\pc_zhengzha.png";
    prompt = @'
你是一名资深游戏美术素材质检员(QA)。请检查下面这张【抠图成品】图片。

角色设定:《无限恐怖》主角郑吒——亚洲青年男性约25岁、黑色短发、深灰蓝色紧身T恤、深色战术长裤、战术腰带、双臂自然下垂、笔直站立全身像,人物轮廓带冷白 rim light。这是一张已抠图的人物精灵图。

请逐项核对并给出明确判断:
1. 主体轮廓是否干净无镂空:头/躯干/腿/裆/脚等部位有没有被错误抠出镂空、透明洞。
2. 边缘是否有毛边碎屑:轮廓边缘有没有参差不齐的锯齿、杂色、残留背景像素。
3. 透明区是否干净:人物外围的透明区有没有残留的灰点、噪点、脏块。
4. 下半身(腿/脚)是否完整:膝盖、脚踝、脚掌有没有缺失或截断。
5. 人物比例:是否苗条/比例正常,有没有衣摆、披风、躯干怪异宽大的畸形。

最后输出格式:
verdict: 合格 / 需微调 / 需重生成
如果合格,简要说明通过理由。
如果需微调或需重生成,明确列出每个问题点(粒度到部位)。
请用中文。
'@
  },
  @{
    id = 'C';
    path = "C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\preview_enemy\preview_enemy_pc_zhengzha.png";
    prompt = @'
你是一名资深游戏美术素材质检员(QA)。请检查下面这张【棋盘格预览】图片。

角色设定:《无限恐怖》主角郑吒——亚洲青年男性约25岁、黑色短发、深灰蓝色紧身T恤、深色战术长裤、战术腰带、双臂自然下垂、笔直站立全身像,人物轮廓带冷白 rim light。此图人物放在棋盘格透明背景上,用来检查抠图边缘质量。

请逐项核对并给出明确判断:
1. 主体轮廓是否干净无镂空:头/躯干/腿/裆/脚等部位有没有被错误抠出镂空、透明洞(透明洞处会露出棋盘格)。
2. 边缘是否有毛边碎屑:边缘有没有锯齿、残色、半透明拖尾。
3. 透明区(棋盘格)是否干净:人物外的棋盘格区域有没有残留灰点、脏块、不该出现的人物残影。
4. 下半身(腿/脚)是否完整:膝盖、脚踝、脚掌有没有缺失截断。
5. 人物比例:是否苗条/比例正常,有没有衣摆/披风/躯干怪异宽大的畸形。

最后输出格式:
verdict: 合格 / 需微调 / 需重生成
如果合格,简要说明通过理由。
如果需微调或需重生成,明确列出每个问题点(粒度到部位)。
请用中文。
'@
  }
)

if ($Num) {
  $targets = @($targets | Where-Object { $_.id -eq $Num })
}

foreach ($t in $targets) {
  $id = $t.id
  $path = $t.path
  $prompt = $t.prompt
  $img = [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
  $ext = [IO.Path]::GetExtension($path).TrimStart('.').ToLower()
  $mime = switch ($ext) { 'jpg' {'image/jpeg'} 'jpeg' {'image/jpeg'} 'webp' {'image/webp'} default {'image/png'} }
  $dataUrl = "data:$mime;base64,$img"
  $payload = @{
    model = 'qwen3.7-flash'
    messages = @( @{
      role = 'user'
      content = @(
        @{ type = 'text'; text = $prompt },
        @{ type = 'image_url'; image_url = @{ url = $dataUrl } }
      )
    } )
    max_tokens = 4000
  } | ConvertTo-Json -Depth 12
  $bodyFile = Join-Path $env:TEMP ("tk_body_pc_c11_" + $id + ".json")
  [System.IO.File]::WriteAllText($bodyFile, $payload, (New-Object System.Text.UTF8Encoding($false)))

  $content = $null
  $tries = 0
  while ($true) {
    $tries++
    $res = & curl.exe -s -X POST 'https://tokenrhythm.studio/v1/chat/completions' -H "Authorization: Bearer $key" -H 'Content-Type: application/json' --data-binary "@$bodyFile"
    $obj = $null
    try { $obj = $res | ConvertFrom-Json } catch { $obj = $null }
    if ($obj -and $obj.choices -and $obj.choices[0].message.content) {
      $content = $obj.choices[0].message.content
      break
    }
    # 429 / 空 content 退避重试
    if ($obj -and $obj.error) {
      $code = "$($obj.error.code)$($obj.error.type)$($obj.error.message)"
    } else {
      $code = $res
    }
    if ($tries -ge 5) {
      $content = "RETRY_FAILED :: $code"
      break
    }
    Start-Sleep -Seconds 15
  }

  $outFile = Join-Path $outdir ("qc_" + $id + "_" + (Get-Date -Format 'yyyyMMdd_HHmmss') + ".txt")
  [System.IO.File]::WriteAllText($outFile, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "=== $id DONE -> $outFile ==="
  Write-Output $content
}