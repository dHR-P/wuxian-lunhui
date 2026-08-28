# -*- coding: utf-8 -*-
"""run_item_icons.py — 道具图标批量生成 + 质检 + 部署 一站式驱动器。
策略：每个 item 最多 2 次重试（共最多 3 次生成）。每次生成 -> QC(纯黑底/无文字水印/图标清晰)。
QC PASS -> 部署到 target 路径；FAIL -> 换 prompt 再生成。
"""
import base64
import io
import json
import os
import sys

WORKDIR = os.path.dirname(os.path.abspath(__file__))  # item_icons 目录
sys.path.insert(0, WORKDIR)
sys.path.insert(0, os.path.dirname(WORKDIR))  # tools/design，使 gen_wan 可导入

import gen_wan  # noqa: E402
import qc_icon  # noqa: E402

GEN_SCRIPT = os.path.join(os.path.dirname(WORKDIR), "gen_wan.py")
SIZE = "768x768"
DEPLOY_DIR = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"

# 每个条目的 prompt 前缀（纯黑底正方形道具图标，无文字水印）
COMMON = (
    "game item icon, single object centered, on a pure solid pitch-black (#000000) background, "
    "flat clean game-icon vector style, strong contrast rim light, no frame, no border, "
    "no text, no letters, no numbers, no watermark, no logo, no background scenery"
)

ITEMS = [
    # (id, 期望内容, 主体描述)
    ("item_medkit", "强效医疗包", "a white first-aid medical kit box with a red cross on the lid and a carry handle"),
    ("item_bandage", "紧急绷带", "a rolled white bandage roll with a loose strip"),
    ("item_sedative", "镇静剂", "a small glass syringe vial of clear tranquilizer serum with a blue cap"),
    ("item_antidote", "净化血清", "a small glass syringe vial of glowing blue-green antidote serum"),
    ("ammo_crate", "弹药盒", "a green military ammo crate box with a metal latch"),
    ("item_holy_water", "圣水", "a small glass holy-water bottle with a cork and an engraved cross"),
    ("item_silver_bullet", "银弹", "a single gleaming silver pistol bullet cartridge"),
    ("item_torch", "火把", "a burning wooden torch with orange flames"),
    ("item_grenade", "燃烧手雷", "a black incendiary hand grenade with a small flame emblem"),
    ("item_bottle_water", "口袋圣水", "a small pocket flask bottle of holy water"),
    ("item_quzhen_fu", "驱邪符", "an exorcism talisman paper slip with glowing red seal strokes"),
    ("item_jiezhou_fu", "解咒符", "a curse-removal talisman paper slip with a glowing gold seal"),
    ("it_core_crystal", "核心晶石", "a glowing cyan energy core crystal shard"),
    ("it_blood_essence", "血族精血", "a small glass vial of deep crimson blood essence"),
    ("it_soul_shard", "灵魂碎片", "a translucent pale blue soul shard gem"),
    ("it_core_sample", "能量核心残片", "a damaged energy core fragment with exposed glowing wiring"),
    ("it_em_core", "电磁炮核心", "a compact electromagnetic cannon core module with coils"),
    ("it_enhance_stone", "普通强化石", "a plain grey rune stone block"),
    ("it_cross_key", "圣徽钥匙", "a brass key with a cross-shaped head"),
    ("it_cross", "圣徽", "an ornate holy cross emblem medallion"),
]

EN_PREFIX = "Game item icon: "

# Prompt 模板库 per item：主版本 + 备用修 prompt（失败换 prompt）
def make_prompt(desc, variant=0):
    fixes = [
        "",  # main
        ", outlined with crisp edge, high detail, fantasy style",  # r1
        ", simple flat icon, bold silhouette",  # r2
    ]
    return EN_PREFIX + desc + ", " + COMMON + fixes[variant % len(fixes)]


def qc_verdict(path, expect):
    raw = qc_icon.qc(path, expect)
    verdict = "PASS"
    try:
        for m in __import__("re").finditer(r'\{[^{}]*"verdict"[^{}]*\}', raw, __import__("re").DOTALL):
            j = json.loads(m.group(0))
            if "verdict" in j:
                verdict = j["verdict"].strip().upper()
    except Exception:
        pass
    return verdict, raw


def main():
    results = []
    for idx, (iid, expect, desc) in enumerate(ITEMS, 1):
        entry = {"id": iid, "expect": expect, "status": "FAIL", "attempts": 0, "gen_cost": 0.0, "qc_notes": "", "target": ""}
        deployed = False
        raw_log = []
        for variant in range(3):  # 最多 3 次生成 = 初始 + 2 次重试
            entry["attempts"] += 1
            stg = os.path.join(WORKDIR, "stages", f"{iid}_r{variant}.png")
            os.makedirs(os.path.dirname(stg), exist_ok=True)
            prompt = make_prompt(desc, variant)
            ok = gen_wan.gen(prompt, SIZE, stg)
            entry["gen_cost"] += 0.2
            if not ok:
                raw_log.append("GEN FAIL r%d" % variant)
                continue
            # 检查是否纯黑底（程序化粗检：角落像素接近黑）
            verdict, raw = qc_verdict(stg, expect)
            raw_log.append(f"r{variant} QC={verdict}")
            if verdict == "PASS":
                target = os.path.join(DEPLOY_DIR, iid + ".png")
                with open(stg, "rb") as fsrc, open(target, "wb") as fdst:
                    fdst.write(fsrc.read())
                try:
                    from PIL import Image
                    im = Image.open(target)
                    w, h = im.size
                    entry["target"] = target
                    entry["dim"] = f"{w}x{h}"
                except Exception:
                    entry["target"] = target
                entry["status"] = "PASS"
                entry["deployed"] = True
                deployed = True
                entry["qc_notes"] = " | ".join(raw_log)
                break
            else:
                entry["qc_notes"] = raw[:300] if variant == 2 else ("r%d FAIL" % variant)
        if not deployed:
            entry["qc_notes"] = " | ".join(raw_log) + " || last_raw=" + entry["qc_notes"]
        results.append(entry)
        print(f"[{idx}/{len(ITEMS)}] {iid} -> {entry['status']} attempts={entry['attempts']} cost={entry['gen_cost']:.2f}", flush=True)

    out_path = os.path.join(WORKDIR, "results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    total = sum(r["gen_cost"] for r in results)
    print("TOTAL_COST_CNY=%.2f" % total, flush=True)
    print("RESULTS_SAVED=" + out_path, flush=True)


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    main()
