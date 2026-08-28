#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
程序化合成 3 条氛围 BGM loop（恐怖悬疑风）
 - bgm_nexus.wav        主神空间：空灵宏大、缓慢和弦垫
 - bgm_horror_loop.wav  恐怖副本：低音垫 + 不和谐高音 + 心跳脉冲
 - bgm_battle.wav       战斗：急促鼓点 + 紧张爬音

输出：16-bit 双声道 wav @ 22050 Hz，首尾相位衔接可无缝循环。
纯 Python（wave + math + struct）手写采样，不依赖 numpy。
"""
import math
import os
import random
import struct
import wave

SAMPLE_RATE = 22050
OUT_DIR = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "server-rs", "ui", "assets", "audio",
))


def synth(path, dur, gen):
    """gen(t) -> 单声道 sample in [-1,1]，写 16-bit 双声道 wav。"""
    n = int(dur * SAMPLE_RATE)
    delay = int(0.0007 * SAMPLE_RATE)  # 右声道轻微延迟，去相关增空间感
    frames = bytearray()
    for i in range(n):
        t = i / SAMPLE_RATE
        s = max(-1.0, min(1.0, gen(t)))
        # 右声道用延迟时间采样，获得轻微空间差异
        ti = max(0, i - delay)
        rs = max(-1.0, min(1.0, gen(ti / SAMPLE_RATE)))
        frames += struct.pack('<h', int(s * 32767))
        frames += struct.pack('<h', int(rs * 32767))
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(frames))


# ---------------- 3 条 BGM ----------------
def bgm_nexus(t):
    """主神空间：C 和弦垫 + 低频长音 + LFO 起伏 + 偶发高频钟鸣泛音。"""
    out = 0.0
    # 缓慢 LFO（40s 周期，整段为完整周期 → 首尾相位衔接）
    lfo = 0.6 + 0.4 * math.sin(2 * math.pi * t / 40.0)
    # 低频长音叠加：110/165/220 Hz（基频+泛音）
    out += 0.18 * lfo * math.sin(2 * math.pi * 110.0 * t)
    out += 0.12 * lfo * math.sin(2 * math.pi * 165.0 * t + 0.25)
    out += 0.10 * lfo * math.sin(2 * math.pi * 220.0 * t + 0.5)
    # 谐波层（空灵 sparkle）
    out += 0.05 * math.sin(2 * math.pi * 330.0 * t + 0.9)
    out += 0.04 * math.sin(2 * math.pi * 440.0 * t + 1.3)
    out += 0.03 * math.sin(2 * math.pi * 660.0 * t + 1.7)
    # 偶发钟鸣：每 10s 一次，指数衰减，高频泛音
    toll = 0.0
    period = 10.0
    ph = t % period
    if ph < 2.0:
        env = math.exp(-ph * 3.0)
        toll += env * 0.05 * (
            math.sin(2 * math.pi * 880.0 * t)
            + 0.5 * math.sin(2 * math.pi * 1760.0 * t + 0.4)
            + 0.25 * math.sin(2 * math.pi * 2640.0 * t + 0.8))
    out += toll
    return out


def bgm_horror(t):
    """恐怖：低音垫 + LFO 颤音 + 不和谐高音(差拍) + 心跳脉冲。"""
    out = 0.0
    # 低沉持续低音 60-80Hz（两个差拍频率制造不安抖动）
    out += 0.20 * math.sin(2 * math.pi * 60.0 * t)
    out += 0.16 * math.sin(2 * math.pi * 66.0 * t)   # 6Hz 差拍
    # LFO 缓慢振幅起伏（3s 周期）
    vib = 0.5 + 0.5 * math.sin(2 * math.pi * t / 3.0)
    out += 0.10 * vib * math.sin(2 * math.pi * 110.0 * t)
    out += 0.06 * (1.0 - vib) * math.sin(2 * math.pi * 109.0 * t)  # 1Hz 差拍滑移
    # 间歇不和谐高音：110 vs 117 Hz（7Hz 差拍）
    dis = 0.0
    period = 6.0
    ph = t % period
    if ph < 1.0:
        env = math.exp(-ph * 3.0)
        dis += env * 0.05 * (
            math.sin(2 * math.pi * 110.0 * t)
            + math.sin(2 * math.pi * 117.0 * t + 0.3))
    out += dis
    # 心跳式脉冲：每 1.6s 两连跳（~75bpm 感）
    bt = t % 1.6
    for lead in (0.0, 0.18):
        d = bt - lead
        if 0.0 <= d < 0.22:
            out += math.exp(-d * 20.0) * 0.30 * math.sin(2 * math.pi * 64.0 * t)
    # 极低频质感
    out += 0.03 * math.sin(2 * math.pi * 25.0 * t + 0.3 * math.sin(2 * math.pi * t / 9.0))
    return out


def bgm_battle(t):
    """战斗：急促鼓点（132bpm 底鼓+踩镲）+ 快速爬音（频率上行）。"""
    out = 0.0
    bpm = 132.0
    beat = 60.0 / bpm  # ~0.4545s
    bar = t % (beat * 4.0)

    # 底鼓：每个 1/4 拍的短促低频脉冲
    bl = bar % beat
    if bl < 0.06:
        out += math.exp(-bl * 55.0) * 0.34 * math.sin(2 * math.pi * 75.0 * t)
    # 踩镲感：奇数拍（2、3）短促高频
    if beat * 2.0 <= bar < beat * 2.0 + 0.05:
        out += math.exp(-(bar - beat * 2.0) * 40.0) * 0.10 * math.sin(2 * math.pi * 7000.0 * t)
    if beat * 3.0 <= bar < beat * 3.0 + 0.05:
        out += math.exp(-(bar - beat * 3.0) * 40.0) * 0.10 * math.sin(2 * math.pi * 7000.0 * t)

    # 快速爬音：半音阶上行（4 步往复 → 无缝 loop）
    step = (bar / beat) % 4.0
    order = [0, 2, 3, 5]
    idx = int(step)
    base = 220.0 * (2 ** ((order[idx] + 7) / 12.0))
    out += 0.07 * math.sin(2 * math.pi * base * t)
    out += 0.03 * math.sin(2 * math.pi * base * 2.0 * t + 0.3)

    # 低音律动
    out += 0.16 * math.sin(2 * math.pi * 55.0 * t)
    return out


SYNTHS = [
    ("bgm_nexus.wav", 40.0, bgm_nexus),
    ("bgm_horror_loop.wav", 32.0, bgm_horror),
    ("bgm_battle.wav", 24.0, bgm_battle),
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    random.seed(20260827)
    results = []
    for name, dur, gen in SYNTHS:
        path = os.path.join(OUT_DIR, name)
        synth(path, dur, gen)
        size = os.path.getsize(path)
        results.append((name, dur, size))
        print("wrote {}  dur={:.1f}s  size={} bytes".format(name, dur, size))
    return results


if __name__ == "__main__":
    main()
