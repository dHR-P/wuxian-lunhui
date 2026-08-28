# -*- coding: utf-8 -*-
"""Qwen3-TTS voice line generation using local model at D:/AI_Tools/qwen3_tts.
Run with ComfyUI's embedded python (has torch+transformers+soundfile).
Usage: python_embeded\\python.exe gen_tts.py <manifest.json>
Writes game/assets/audio/<id>.wav
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "game", "assets", "audio")
TTS_DIR = r"D:\AI_Tools\qwen3_tts"
sys.path.insert(0, TTS_DIR)

from qwen3_tts import Qwen3TTS  # noqa: E402


def main():
    manifest = json.load(open(sys.argv[1], encoding="utf-8"))
    os.makedirs(OUTDIR, exist_ok=True)
    tts = Qwen3TTS(model_path=TTS_DIR)
    for v in manifest["voices"]:
        out = os.path.join(OUTDIR, v["id"] + ".wav")
        try:
            tts.generate_speech(v["text"], output_path=out, speaker_id=v.get("speaker_id", 0))
            print("DONE %s" % out, flush=True)
        except Exception as e:
            print("FAIL %s: %s" % (v["id"], e), flush=True)


if __name__ == "__main__":
    main()
