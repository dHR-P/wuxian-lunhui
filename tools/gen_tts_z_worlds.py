# -*- coding: utf-8 -*-
"""Z宇宙四副本（末世死城/银色大地/异形4/天蛇）本地配音素材生成（暂存版）。

仿 gen_tts_zhouyuan.py 的 Qwen3-TTS CustomVoice 用法，但：
  - 不修改任何既有 .rs/.js/.json 文件（不动既有 manifest / scenes）。
  - manifest 独立使用 tools/assets_manifest_zy_worlds.json（新建）。
  - 输出写 tools/design/audio_z_worlds/*.wav（暂存），不写 server-rs/ui/assets/audio。
  - 每条最多重试 3 次：首次用 manifest 指定 speaker；失败/时长<0.5s 则按音色族回退重试。
  - 运行：需先设置 $env:PYTHONIOENCODING="utf-8"
        PS> $env:PYTHONIOENCODING="utf-8"; & D:\\ai_vllm_env\\Scripts\\python.exe tools/gen_tts_z_worlds.py
"""
import json, os, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "design", "audio_z_worlds")
MODEL = r"D:\AI_Tools\qwen3_tts_customvoice"

# 备用 speaker：按音色族回退（男声族 / 女声族 / 气声族）
MALE = ["uncle_fu", "dylan", "eric", "aiden"]
FEMALE = ["serena", "sohee", "vivian", "ono_anna"]
BREATHY = ["ono_anna", "serena", "vivian"]   # 嘶吼/气声类
FALLBACK = {
    "uncle_fu": MALE[1:] + FEMALE[:1],
    "dylan":    MALE[2:] + FEMALE[:1],
    "eric":     MALE[3:] + FEMALE[:1],
    "aiden":    MALE[:0] + FEMALE[:1],
    "serena":   FEMALE[1:] + MALE[:1],
    "sohee":    FEMALE[2:] + MALE[:1],
    "vivian":   FEMALE[3:] + MALE[:1],
    "ono_anna": BREATHY[1:] + MALE[:1],
}
MAX_ATTEMPTS = 3


def main():
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel

    manifest = json.load(open(os.path.join(ROOT, "tools", "assets_manifest_zy_worlds.json"), encoding="utf-8-sig"))
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
        attempts = [speaker] + FALLBACK.get(speaker.lower(), MALE[:2])[:2]
        ok = False
        last_speaker = None
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
                done_at = i + 1
                last_speaker = spk
                if dur > 0.5:
                    ok = True
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
            results.append({"id": vid, "ok": False, "attempt": "MAX_RETRIES", "speaker": last_speaker, "path": path,
                            "text": v["text"]})
            print("FAILED_ALL", vid, flush=True)

    # 汇总落盘
    summ = os.path.join(ROOT, "tools", "design", "audio_z_worlds", "_generate_summary.json")
    json.dump(results, open(summ, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    n_ok = sum(1 for r in results if r["ok"])
    print(f"\nSUMMARY: {n_ok}/{len(results)} ok -> {summ}", flush=True)


if __name__ == "__main__":
    main()