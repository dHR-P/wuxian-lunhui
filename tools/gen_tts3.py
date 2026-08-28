# -*- coding: utf-8 -*-
"""增量生成新增 NPC 语音（张杰/红后/蕾恩），复用 Qwen3-TTS CustomVoice"""
import json, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT2 = os.path.join(ROOT, "server-rs", "ui", "assets", "audio")
MODEL = r"D:\AI_Tools\qwen3_tts_customvoice"

WANT = {"vo_zhangjie_world", "vo_redqueen_quiz", "vo_rain_hint"}
VOICE_MAP = {
    "vo_zhangjie_world": ("Uncle_Fu", "低沉老练、略带嘲讽的男声，像老兵在叮嘱新人"),
    "vo_redqueen_quiz":  ("Serena",   "清澈稚嫩但毫无感情的童声，平直得像在读说明书"),
    "vo_rain_hint":      ("Serena",   "利落干练的女声，语速快，带着警告的意味"),
}


def main():
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel

    manifest = json.load(open(os.path.join(ROOT, "tools", "assets_manifest.json"), encoding="utf-8-sig"))
    os.makedirs(OUT2, exist_ok=True)
    print("loading Qwen3TTSModel from", MODEL, flush=True)
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu")
    print("loaded.", flush=True)

    for v in manifest["voices"]:
        vid = v["id"]
        if vid not in WANT:
            continue
        speaker, instruct = VOICE_MAP.get(vid, ("Uncle_Fu", ""))
        try:
            wavs, sr = model.generate_custom_voice(
                text=v["text"],
                language="Chinese",
                speaker=speaker,
                instruct=instruct or None,
            )
            p2 = os.path.join(OUT2, vid + ".wav")
            sf.write(p2, wavs[0], sr)
            print("DONE", vid, f"{len(wavs[0])/sr:.1f}s", flush=True)
        except Exception as e:
            print("FAIL", vid, repr(e), flush=True)


if __name__ == "__main__":
    main()
