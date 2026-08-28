# -*- coding: utf-8 -*-
"""《咒怨》本地配音素材生成（暂存版）。

仿 gen_tts3.py 的 Qwen3-TTS CustomVoice 用法，但：
  - 不修改任何既有文件（不动 gen_tts3.py / assets_manifest.json）。
  - manifest 独立使用 tools/assets_manifest_zhouyuan.json。
  - 输出写 tools/design/audio_zhouyuan/*.wav（暂存），不写 server-rs/ui/assets/audio。
  - 每条最多重试 3 次：首次用 manifest 指定 speaker；失败则换备用女/男声再试。
运行：D:\\ai_vllm_env\\Scripts\\python.exe tools/gen_tts_zhouyuan.py
"""
import json, os, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "design", "audio_zhouyuan")
MODEL = r"D:\AI_Tools\qwen3_tts_customvoice"

# 备用 speaker：指定 speaker 失败时的回退顺序（女声低语回退 oono_anna/serena；男声回退 uncle_fu）
FALLBACK = {
    "ono_anna": ["serena", "sohee", "vivian"],
    "serena":   ["sohee", "ono_anna", "vivian"],
    "sohee":    ["serena", "vivian", "ono_anna"],
    "vivian":   ["sohee", "serena", "ono_anna"],
    "uncle_fu": ["dylan", "eric", "aiden"],
    "dylan":    ["uncle_fu", "eric", "aiden"],
}
MAX_ATTEMPTS = 3


def main():
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel

    manifest = json.load(open(os.path.join(ROOT, "tools", "assets_manifest_zhouyuan.json"), encoding="utf-8-sig"))
    os.makedirs(OUT, exist_ok=True)

    print("loading Qwen3TTSModel from", MODEL, flush=True)
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu")
    supported = set(model.get_supported_speakers())
    print("supported speakers:", sorted(supported), flush=True)

    results = []
    for v in manifest["voices"]:
        vid = v["id"]
        path = os.path.join(OUT, vid + ".wav")
        speaker = v.get("voice", "uncle_fu")
        instruct = v.get("instruct", "")
        attempts = [speaker] + FALLBACK.get(speaker.lower(), [])[:2]
        ok = False
        done_at = None
        for i, spk in enumerate(attempts[:MAX_ATTEMPTS]):
            if spk.lower() not in supported:
                print(f"SKIP {vid}: speaker {spk!r} not supported", flush=True)
                continue
            try:
                wavs, sr = model.generate_custom_voice(
                    text=v["text"], language="Chinese",
                    speaker=spk, instruct=instruct or None,
                )
                sf.write(path, wavs[0], sr)
                dur = len(wavs[0]) / sr
                ok = dur > 0.5
                done_at = i + 1
                if ok:
                    print(f"DONE {vid} speaker={spk} attempt={done_at} dur={dur:.2f}s size={os.path.getsize(path)}", flush=True)
                    results.append({"id": vid, "ok": True, "speaker": spk, "attempt": done_at,
                                    "dur_s": round(dur, 2), "size": os.path.getsize(path), "path": path})
                    break
                else:
                    print(f"WARN {vid}: dur={dur:.2f}s <0.5s, retrying", flush=True)
            except Exception as e:
                print(f"FAIL {vid} attempt={i+1} speaker={spk}: {e!r}", flush=True)
                time.sleep(1)
        if not ok:
            results.append({"id": vid, "ok": False, "attempt": "MAX_RETRIES", "path": path})
            print("FAILED_ALL", vid, flush=True)

    # 汇总落盘
    summ = os.path.join(ROOT, "tools", "design", "audio_zhouyuan", "_generate_summary.json")
    json.dump(results, open(summ, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    n_ok = sum(1 for r in results if r["ok"])
    print(f"\nSUMMARY: {n_ok}/{len(results)} ok -> {summ}", flush=True)


if __name__ == "__main__":
    main()