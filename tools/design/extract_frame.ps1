param(
    [Parameter(Mandatory=$true)][string]$VideoPath,
    [Parameter(Mandatory=$true)][double]$Seconds,
    [Parameter(Mandatory=$true)][string]$OutPng
)
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$script:done = $false
$script:errorMsg = $null
$script:outW = 0
$script:outH = 0
$script:phase = 0   # 0=wait open, 1=seeking/playing, 2=at target(pause), 3=drawing
$script:tickCount = 0
$script:frame = $null

$dispatcher = [System.Windows.Threading.Dispatcher]::CurrentDispatcher
$player = [System.Windows.Media.MediaPlayer]::new()
$player.Open([System.Uri]::new($VideoPath))

$timer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Background, $dispatcher)
$timer.Interval = [TimeSpan]::FromMilliseconds(50)
$timer.Add_Tick({
    $script:tickCount++
    try {
        if ($script:phase -eq 0) {
            if ($player.NaturalVideoWidth -gt 0) {
                $script:outW = $player.NaturalVideoWidth
                $script:outH = $player.NaturalVideoHeight
                $player.Position = [System.TimeSpan]::FromSeconds($Seconds)
                $player.Play()
                $script:phase = 1
            } elseif ($script:tickCount -gt 500) {
                throw "Media open timeout"
            }
        }
        elseif ($script:phase -eq 1) {
            if ($player.Position.TotalSeconds -ge ($Seconds - 0.02)) {
                $player.Pause()
                $script:phase = 2
            } elseif ($script:tickCount -gt 800) {
                throw "Seek timeout at $($player.Position.TotalSeconds)s"
            }
        }
        elseif ($script:phase -eq 2) {
            $dvisual = [System.Windows.Media.DrawingVisual]::new()
            $dc = $dvisual.RenderOpen()
            $dc.DrawVideo($player, [System.Windows.Rect]::new(0, 0, $script:outW, $script:outH))
            $dc.Close()
            $rtb = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($script:outW, $script:outH, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
            $rtb.Render($dvisual)
            $enc = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
            $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb))
            $fs = [System.IO.File]::Open($OutPng, [System.IO.FileMode]::Create)
            try { $enc.Save($fs) } finally { $fs.Close() }
            $player.Close()
            $script:phase = 3
            $script:done = $true
            if ($script:frame) { $script:frame.Continue = $false }
        }
    } catch {
        $script:errorMsg = $_.Exception.ToString()
        $script:done = $true
        if ($script:frame) { $script:frame.Continue = $false }
    }
})
$timer.Start()

$script:frame = [System.Windows.Threading.DispatcherFrame]::new()
[System.Windows.Threading.Dispatcher]::PushFrame($script:frame)
$timer.Stop()
if (-not $script:done) { $script:errorMsg = "Overall timeout" }

if ($script:errorMsg) { Write-Output "ERROR: $script:errorMsg"; exit 1 }
Write-Output "OK ${script:outW}x${script:outH}"
