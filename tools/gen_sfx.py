#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
程序化音效合成脚本 (game SFX)
用 numpy 合成正弦 + 白噪声 + 指数衰减包络 + 滑频，输出 16-bit 单声道 WAV。

输出到: <repo>/server-rs/ui/assets/audio/sfx_*.wav
记录到: <repo>/tools/design/sfx_log.md

依赖: numpy (本机可用 D:\\ai_vllm_env\\Scripts\\python.exe)
"""
import os
import sys
import math
import wave
import struct
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, "server-rs", "ui", "assets", "audio")
LOG_DIR = os.path.join(REPO, "tools", "design")
LOG_FILE = os.path.join(LOG_DIR, "sfx_log.md")

SR = 44100  # sample rate
BITS = 16

# ---- 基础工具 ----

def env_exp(n, decay):
    """指数衰减包络: env = exp(-t*decay); n 为样本数"""
    t = np.arange(n) / SR
    return np.exp(-t * decay)


def noise(n, rng):
    """白噪声 [-1,1]"""
    return rng.uniform(-1.0, 1.0, n)


def sine_freq(n, f0, f1, rng):
    """正弦，频率从 f0 线性滑到 f1"""
    t = np.arange(n) / SR
    # 相位 = 2*pi * integral(f(t)) dt
    freq = np.linspace(f0, f1, n)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase)


def freq_mod(n, base, depth, rate, rng=None):
    """频率调制颤音: base + depth*sin(2*pi*rate*t)"""
    t = np.arange(n) / SR
    mod = depth * np.sin(2 * np.pi * rate * t)
    f = base + mod
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase)


def crossfade(a, b, nf):
    """在尾部 nf 样本做线性交叉淡化，用于环路首尾衔接"""
    ramp = np.linspace(0, 1, nf)
    aa = a.copy()
    bb = b.copy()
    aa[-nf:] = aa[-nf:] * (1 - ramp)
    bb[:nf] = bb[:nf] * ramp
    return aa + bb


def normalize(x, peak=0.9):
    """归一化到 peak 峰值"""
    m = np.max(np.abs(x))
    if m < 1e-9:
        return x
    return x / m * peak


def write_wav(path, data):
    """写 16-bit 单声道 WAV"""
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---- 各音效合成 ----

def sfx_hit(rng):
    # 命中：低频"砰"正弦(相位滑落) + 高频噪声瞬态
    n = int(0.35 * SR)
    body = sine_freq(n, 320, 90, rng) * env_exp(n, 24)
    nnoise = 0.09 * SR
    nz = noise(int(nnoise), rng) * env_exp(int(nnoise), 70)
    out = np.zeros(n)
    out[:int(nnoise)] += nz
    out += body * 0.9
    return normalize(out)


def sfx_swing(rng):
    # 挥砍："嗖" 频扫，白噪声高通 + 低频正弦滑向
    n = int(0.5 * SR)
    nz = noise(n, rng)
    # 一阶高通滤波（差分），削弱低频让噪声更"嗖"
    nz_hi = np.diff(nz, prepend=0)
    env = env_exp(n, 9)
    out = nz_hi * env
    # 叠加一次低频"嗖"正弦滑向（700->220Hz）
    out += sine_freq(n, 700, 220, rng) * env * 0.5
    return normalize(out)


def sfx_step(rng):
    # 脚步：短促"嗒"，低落频撞击 + 窄噪声
    n = int(0.22 * SR)
    thump = sine_freq(n, 150, 55, rng) * env_exp(n, 45)
    nz = noise(n, rng) * env_exp(n, 90) * 0.4
    return normalize(thump + nz)


def sfx_dodge(rng):
    # 闪避：快速气流"咻"，高频噪声下滑
    n = int(0.35 * SR)
    nz = noise(n, rng)
    nz_hi = np.diff(nz, prepend=0)
    env = env_exp(n, 14)
    out = nz_hi * env
    out += sine_freq(n, 1400, 500, rng) * env * 0.3
    return normalize(out)


def sfx_click(rng):
    # UI 点击：清脆"哒"，短方波似正弦高音瞬态
    n = int(0.12 * SR)
    click = sine_freq(n, 1800, 900, rng) * env_exp(n, 60)
    nz = noise(n, rng) * env_exp(n, 120) * 0.3
    return normalize(click + nz)


def sfx_hurt(rng):
    # 受击：闷响 + 下降音调
    n = int(0.55 * SR)
    body = sine_freq(n, 560, 70, rng) * env_exp(n, 13)
    nz = noise(n, rng) * env_exp(n, 60) * 0.35
    return normalize(body + nz)


def sfx_kill(rng):
    # 击杀：胜利短促上扬 + 金属明亮音
    n = int(0.6 * SR)
    rise = sine_freq(n, 400, 1300, rng) * env_exp(n, 10)
    chord = (sine_freq(n, 660, 880, rng) + sine_freq(n, 990, 1320, rng)) * env_exp(n, 12) * 0.4
    nz = noise(n, rng) * env_exp(n, 80) * 0.2
    return normalize(rise + chord + nz)


def sfx_pickup(rng):
    # 拾取：明亮上行双音
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    # 两个正弦包络（先后两次"叮"）模拟双音
    e1 = np.exp(-t * 12)
    e2 = np.exp(-((t - 0.15) ** 2) * 40) * 0.6
    f = 880 + 1200 * (t / max(t[-1], 1e-9))  # 上行
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) * (e1 + 0.8 * e2)
    tone += sine_freq(n, 1760, 2400, rng) * e1 * 0.25
    nz = noise(n, rng) * env_exp(n, 90) * 0.15
    return normalize(tone + nz)


def sfx_gate(rng):
    # 开门/门禁：低沉机械"轧"，低频矩形感
    n = int(1.2 * SR)
    base = 55
    # 低频锯齿样调制（机械吱呀感）
    t = np.arange(n) / SR
    grow = 1 + 2.5 * (t / t[-1])  # 频率逐渐升高
    f = base * grow
    phase = 2 * np.pi * np.cumsum(f) / SR
    creak = np.sin(phase) + 0.4 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR)
    # 缓慢上升又衰减的包络（门缓缓开）
    env = (np.clip(t / 0.4, 0, 1)) * np.exp(-np.clip((t - 0.9), 0, None) * 4)
    nz = noise(n, rng) * env * 0.12
    out = creak * env
    return normalize(out + nz)


def sfx_ambient_loop(rng):
    # 恐怖环境底噪(循环2-4s,首尾衔接)：低频嗡 + 风声
    dur = 4.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    # 低频嗡 (56Hz 加谐波)
    hum = (np.sin(2 * np.pi * 56 * t)
           + 0.5 * np.sin(2 * np.pi * 112 * t)
           + 0.25 * np.sin(2 * np.pi * 168 * t))
    hum_env = 0.35 + 0.1 * np.sin(2 * np.pi * 0.13 * t)  # 缓慢起伏
    hum = hum * hum_env
    # 风声：缓慢调制的带限噪声
    wind_rate = 0.09  # 慢调制
    wind_env = 0.15 * (0.6 + 0.4 * np.sin(2 * np.pi * wind_rate * t + 1.3))
    wind = np.diff(noise(n, rng), prepend=0) * wind_env
    out = hum + wind
    # 首尾衔接：重叠交叉淡化保证循环无爆音
    nf = int(0.5 * SR)  # 0.5s 交叉
    out = crossfade(out, out.copy(), nf)
    return normalize(out, 0.5)


# ---- 主流程 ----

GENERATORS = [
    ("sfx_hit.wav",          sfx_hit,          "命中短促低频砰+噪声瞬态"),
    ("sfx_swing.wav",        sfx_swing,        "挥砍快速嗖声波频扫"),
    ("sfx_step.wav",         sfx_step,         "脚步短促嗒"),
    ("sfx_dodge.wav",        sfx_dodge,        "闪避快速气流咻"),
    ("sfx_click.wav",        sfx_click,        "UI按钮点击清脆哒"),
    ("sfx_hurt.wav",         sfx_hurt,         "受击闷响+下降音调"),
    ("sfx_kill.wav",         sfx_kill,         "击杀胜利短促上扬"),
    ("sfx_pickup.wav",       sfx_pickup,       "拾取明亮上行双音"),
    ("sfx_gate.wav",         sfx_gate,         "开门低沉机械轧"),
    ("sfx_ambient_loop.wav", sfx_ambient_loop, "恐怖环境低频嗡+风声循环"),
]


def seconds_of(path):
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        fr = w.getframerate()
        return n / float(fr)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)

    lines = []
    lines.append("# SFX 合成日志")
    lines.append("")
    lines.append("程序化合成：numpy 正弦波 + 白噪声 + 指数衰减包络 + 滑频（频率随时间变化）。")
    lines.append("格式：16-bit 单声道 WAV @ 44100Hz。")
    lines.append("")
    lines.append("| 文件 | 时长(s) | 合成方式 |")
    lines.append("| --- | --- | --- |")

    results = []
    rng = np.random.default_rng(20260828)  # 固定种子，可复现

    for fname, fn, desc in GENERATORS:
        path = os.path.join(OUT_DIR, fname)
        data = fn(rng)
        write_wav(path, data)
        size = os.path.getsize(path)
        dur = seconds_of(path)
        results.append((fname, size, dur))
        lines.append(f"| `{fname}` | {dur:.3f} | {desc} |")
        print(f"[OK] {fname}  {dur:.2f}s  {size} bytes")

    lines.append("")
    lines.append("## 验收")
    lines.append("")
    all_ok = True
    for fname, size, dur in results:
        ok = size > 1024 and dur > 0
        all_ok = all_ok and ok
        lines.append(f"- `{fname}`: size={size} bytes (>1KB: {'YES' if size > 1024 else 'NO'}), "
                     f"dur={dur:.3f}s（wave 可读）")
    lines.append("")
    lines.append(f"**全部通过: {all_ok}**")
    lines.append("部署路径: `server-rs/ui/assets/audio/`")

    # 追加时间戳
    import datetime
    lines.insert(2, f"生成时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.insert(3, "")

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\n[LOG] {LOG_FILE}")
    print(f"[ALL_OK] {all_ok}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
