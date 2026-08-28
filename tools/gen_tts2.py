# -*- coding: utf-8 -*-
"""Qwen3-TTS 官方 qwen_tts 包驱动（CustomVoice 0.6B 本地权重）
用法: D:/ai_vllm_env/Scripts/python.exe gen_tts2.py
输出: game/assets/audio/*.wav 并同步到 server-rs/ui/assets/audio/
"""
import json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT1 = os.path.join(ROOT, "game", "assets", "audio")
OUT2 = os.path.join(ROOT, "server-rs", "ui", "assets", "audio")
MODEL = r"D:\AI_Tools\qwen3_tts_customvoice"

# 台词 → 音色/指令（中文原生音色：Uncle_Fu 低沉男 / Dylan 京腔男 / Serena 温润女）
VOICE_MAP = {
    "vo_question": ("Uncle_Fu", "用低沉、缓慢、充满压迫感的神秘语气说"),
    "vo_rules":    ("Uncle_Fu", "冷静、老练、略带一丝嘲讽的男声"),
    "vo_warning":  ("Uncle_Fu", "严肃冷峻、一字一顿地警告"),
    "vo_mission":  ("Dylan",    "毫无感情的平缓机械播报腔"),
    "vo_awaken":   ("Dylan",    "从压抑到爆发、震撼的内心呐喊"),
    "vo_settle":   ("Serena",   "平静、正式的系统播报语气"),
}


def main():
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel

    manifest = json.load(open(os.path.join(ROOT, "tools", "assets_manifest.json"), encoding="utf-8"))
    os.makedirs(OUT1, exist_ok=True)
    os.makedirs(OUT2, exist_ok=True)

    print("loading Qwen3TTSModel(CustomVoice 0.6B) from", MODEL, flush=True)
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu")
    print("loaded. supported speakers:", model.get_supported_speakers(), flush=True)

    for v in manifest["voices"]:
        vid = v["id"]
        speaker, instruct = VOICE_MAP.get(vid, ("Uncle_Fu", ""))
        try:
            wavs, sr = model.generate_custom_voice(
                text=v["text"],
                language="Chinese",
                speaker=speaker,
                instruct=instruct or None,
            )
            p1 = os.path.join(OUT1, vid + ".wav")
            sf.write(p1, wavs[0], sr)
            shutil.copyfile(p1, os.path.join(OUT2, vid + ".wav"))
            print("DONE", vid, f"{len(wavs[0])/sr:.1f}s", flush=True)
        except Exception as e:
            print("FAIL", vid, repr(e), flush=True)


if __name__ == "__main__":
    main()
