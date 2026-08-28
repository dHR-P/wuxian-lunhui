param([string]$cmd, [int]$idx = -1, [string]$expect = '', [int]$timeoutMs = 6000, [double]$a2 = 0, [double]$a3 = 0, [string]$a1 = '')
Write-Output ("cmd={0} idx={1} expect={2} timeout={3} a2={4} a3={5} a1={6}" -f $cmd, $idx, $expect, $timeoutMs, $a2, $a3, $a1)
