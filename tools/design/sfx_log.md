# SFX 合成日志

生成时间: 2026-08-28 13:42:29

程序化合成：numpy 正弦波 + 白噪声 + 指数衰减包络 + 滑频（频率随时间变化）。
格式：16-bit 单声道 WAV @ 44100Hz。

| 文件 | 时长(s) | 合成方式 |
| --- | --- | --- |
| `sfx_hit.wav` | 0.350 | 命中短促低频砰+噪声瞬态 |
| `sfx_swing.wav` | 0.500 | 挥砍快速嗖声波频扫 |
| `sfx_step.wav` | 0.220 | 脚步短促嗒 |
| `sfx_dodge.wav` | 0.350 | 闪避快速气流咻 |
| `sfx_click.wav` | 0.120 | UI按钮点击清脆哒 |
| `sfx_hurt.wav` | 0.550 | 受击闷响+下降音调 |
| `sfx_kill.wav` | 0.600 | 击杀胜利短促上扬 |
| `sfx_pickup.wav` | 0.500 | 拾取明亮上行双音 |
| `sfx_gate.wav` | 1.200 | 开门低沉机械轧 |
| `sfx_ambient_loop.wav` | 4.000 | 恐怖环境低频嗡+风声循环 |

## 验收

- `sfx_hit.wav`: size=30912 bytes (>1KB: YES), dur=0.350s（wave 可读）
- `sfx_swing.wav`: size=44144 bytes (>1KB: YES), dur=0.500s（wave 可读）
- `sfx_step.wav`: size=19448 bytes (>1KB: YES), dur=0.220s（wave 可读）
- `sfx_dodge.wav`: size=30912 bytes (>1KB: YES), dur=0.350s（wave 可读）
- `sfx_click.wav`: size=10628 bytes (>1KB: YES), dur=0.120s（wave 可读）
- `sfx_hurt.wav`: size=48554 bytes (>1KB: YES), dur=0.550s（wave 可读）
- `sfx_kill.wav`: size=52964 bytes (>1KB: YES), dur=0.600s（wave 可读）
- `sfx_pickup.wav`: size=44144 bytes (>1KB: YES), dur=0.500s（wave 可读）
- `sfx_gate.wav`: size=105884 bytes (>1KB: YES), dur=1.200s（wave 可读）
- `sfx_ambient_loop.wav`: size=352844 bytes (>1KB: YES), dur=4.000s（wave 可读）

**全部通过: True**
部署路径: `server-rs/ui/assets/audio/`
