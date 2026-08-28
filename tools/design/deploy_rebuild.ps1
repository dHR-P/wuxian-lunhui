# -*- coding: utf-8 -*-
"""deploy_rebuild.ps1 — 素材定稿 + 多世界 P0 验收后的统一重建重启脚本(主线专用,验收通过后执行)。

用途:①cargo build --release ②替换素材(可选) ③taskkill 旧游戏进程 ④拉起 release exe。
注意:cargo stderr 噪声致退出码 1,以输出出现 "Finished release profile" 为准;进程 taskkill 按实际 PID。
"""
$ErrorActionPreference = "Continue"
$root = "C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"

Write-Host "=== [1/4] cargo build --release ===" -ForegroundColor Cyan
Push-Location "$root\server-rs"
cargo build --release 2>&1 | Tee-Object -FilePath "$root\tools\design\build_release.log"
$buildOk = Select-String -Path "$root\tools\design\build_release.log" -Pattern "Finished release profile" -Quiet
Pop-Location
Write-Host "build_release 完成标记: $buildOk" -ForegroundColor $(if($buildOk){"Green"}else{"Red"})

Write-Host "=== [2/4] 素材替换(若 raw_enemy/定稿文件就绪) ===" -ForegroundColor Cyan
# 由验收结论决定:定稿素材若在 tools/design/cutout_out/*_cut.png 且 qwen 判定可发布,
# 手动确认后再覆盖 server-rs/ui/assets/img/。此处仅打印待办,不自动覆盖。
Get-ChildItem "$root\tools\design\cutout_out" -File -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "候选: $($_.Name) $($_.Length)B" }

Write-Host "=== [3/4] 杀旧进程 ===" -ForegroundColor Cyan
$old = Get-Process -Name "wuxian_horror_ch1" -ErrorAction SilentlyContinue
if ($old) { $old | ForEach-Object { Write-Host "taskkill PID=$($_.Id)"; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } } else { Write-Host "无旧进程" }

Write-Host "=== [4/4] 拉起 release ===" -ForegroundColor Cyan
$exe = "$root\server-rs\target\release\deps\wuxian_horror_ch1.exe"
if (Test-Path $exe) { Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe); Write-Host "已启动: $exe" } else { Write-Host "exe 未找到: $exe" }

Write-Host "=== 完成 ===" -ForegroundColor Cyan