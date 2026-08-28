# -*- coding: utf-8 -*-
"""rerun_item_icons.py — 针对首批 FAIL 的 5 个道具，用硬化 prompt 重新生成+质检+部署。
硬化要点：纯黑底、无背景光晕/发光泛溢、符箓禁含任何文字。
"""
import base64
import io
import json
import os
import re
import sys

WORKDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, WORKDIR)
sys.path.insert(0, os.path.dirname(WORKDIR))
import gen_wan  # noqa
import qc_icon  # noqa

SIZE = "768x768"
DEPLOY_DIR = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"

HARD = (
    "game item icon, single object centered, isolated on a perfectly flat solid pure black #000000 background. "
    "The entire area around the object must be pure black with ABSOLUTELY NO glow, no halo, no light spill, "
    "no vignette, no gradient, no reflection — nothing but black outside the object silhouette. "
    "flat clean game-icon style, crisp edges, no text, no letters, no numbers, no watermark, no logo, no border, no frame."
)

# 硬化 prompt per FAIL item（覆盖首个 FAIL 原因）
FAILS = {
    "item_bandage": ("紧急绷带", [
        "a compact white gauze bandage roll with a visible material texture and a red cross mark, clearly a first-aid bandage, not tissue paper",
        "a neat white rolled gauze bandage spool with a red cross badge on it, medical supply icon",
        "a white bandage roll with gauze weave pattern and a red medical cross",
    ]),
    "item_torch": ("火把", [
        "a wooden torch with a small flame at the top, the flame fully contained inside the torch head with minimal tiny flame glow that stays within the object, background stays pure black",
        "a simple wooden torch, flame small and contained, clean silhouette, background pure black with no glow aura",
        "a cartoon torch with small fire tip, flame confined to torch top, solid pure black background no halo",
    ]),
    "item_jiezhou_fu": ("解咒符", [
        "a blank pale yellow talisman paper slip with one simple gold square seal, NO Chinese characters, NO text, NO letters, NO symbols, blank paper with a plain gold seal",
        "an empty talisman paper strip with a plain golden seal stamp, completely blank yellow paper otherwise, no writing no characters",
        "a talisman slip with only a single red-gold seal mark, the rest of the paper is blank, no text no characters anywhere",
    ]),
    "it_core_crystal": ("核心晶石", [
        "a single glowing cyan energy crystal shard, its glow tightly contained inside the crystal shape, background pure black with no outer glow, no halo",
        "an energy core crystal with inner glow only inside the gem, no light escaping to the black background, no aura",
        "a crystal shard with a dim internal cyan light, background solid black no luminescence",
    ]),
    "it_soul_shard": ("灵魂碎片", [
        "a translucent pale-blue soul shard gem with gentle inner light fully inside the gem, background pure black no aura no outer glow",
        "a pale blue soul fragment crystal, light only inside the shard, solid black background no halo",
        "a small soul shard gem, soft internal light contained, pitch black background with no glow ring",
    ]),
}


def qc_verdict(path, expect):
    raw = qc_icon.qc(path, expect)
    verdict = "PASS"
    for m in re.finditer(r'\{[^{}]*"verdict"[^{}]*\}', raw, re.DOTALL):
        try:
            j = json.loads(m.group(0))
            if "verdict" in j:
                verdict = j["verdict"].strip().upper()
        except Exception:
            pass
    return verdict, raw


def main():
    results = []
    for iid, (expect, desc_list) in FAILS.items():
        entry = {"id": iid, "expect": expect, "status": "FAIL", "attempts": 0, "gen_cost": 0.0, "qc_notes": "", "target": ""}
        raw = ""
        for variant, desc in enumerate(desc_list):
            entry["attempts"] += 1
            stg = os.path.join(WORKDIR, "re_stages", f"{iid}_r{variant}.png")
            os.makedirs(os.path.dirname(stg), exist_ok=True)
            prompt = desc + ", " + HARD
            if not gen_wan.gen(prompt, SIZE, stg):
                entry["qc_notes"] += f"GENFAIL r{variant}; "
                entry["gen_cost"] += 0.2
                continue
            entry["gen_cost"] += 0.2
            verdict, raw = qc_verdict(stg, expect)
            entry["qc_notes"] += f"r{variant} QC={verdict}; "
            if verdict == "PASS":
                target = os.path.join(DEPLOY_DIR, iid + ".png")
                with open(stg, "rb") as fsrc, open(target, "wb") as fdst:
                    fdst.write(fsrc.read())
                try:
                    from PIL import Image
                    im = Image.open(target)
                    entry["dim"] = f"{im.size[0]}x{im.size[1]}"
                except Exception:
                    pass
                entry["status"] = "PASS"
                entry["target"] = target
                break
        entry["qc_notes"] = entry["qc_notes"].strip("; ")
        entry["last_raw"] = raw[:200]
        results.append(entry)
        print(f"{iid} -> {entry['status']} attempts={entry['attempts']} cost={entry['gen_cost']:.2f}", flush=True)
    out = os.path.join(WORKDIR, "results_rerun.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("RERUN_COST=%.2f" % sum(r["gen_cost"] for r in results), flush=True)
    print("SAVED=" + out, flush=True)


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    main()
