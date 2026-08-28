# -*- coding: utf-8 -*-
"""qc_npc10.py — 10 类职业型 NPC 立绘质检（qwen3.7-flash，任务指定）。
复用 qc_enemy8.ask（qwen3.7-flash, data URL base64, max_tokens 4000, 耐心退避）。
用法: <comfy-python> qc_npc10.py raw|cut <slug> [variant]
输出: tools/design/qc_npc10/<stage>_<slug>.md
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qc_enemy8 import ask  # noqa: E402

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_npc10"
DEPLOY = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_npc10"
os.makedirs(OUT, exist_ok=True)

# 与 gen_npc10.SETTING 一致：中文正式设定
SETTING = {
    "npc_guard": "守卫: 成年亚洲男性, 深蓝制服+臂章肩章+黑色大檐帽, 双手在腰间持黑手枪（安全收枪位）, 严肃。",
    "npc_survivor": "幸存者: 30多岁平民男性, 破旧染污深色外套+皱衬衫, 脸上尘土与抓伤, 惊恐瞪眼, 抱臂缩身。",
    "npc_watcher": "守夜人: 消瘦成年身形, 兜帽罩面, 深灰兜帽长袍, 单手胸前提旧铁油灯, 灯光只在小范围不外泄, 警戒。",
    "npc_merchant": "商人: 中年男性, 体面暗色西装背心/白衬衫领带, 金怀表链, 托钱袋, 精明算计眼神。",
    "npc_doctor": "医生: 成年（男女皆可）, 白大褂+颈挂听诊器, 持记录板, 专业平静。",
    "npc_soldier": "士兵: 成年男性, 深绿野战军装+战术防弹背心+头盔, 双手胸前持步枪（枪口朝上安全）, 警觉。",
    "npc_villager": "村民: 中年男性, 朴素粗布农装, 草帽/布巾, 对襟布褂+布裤+草鞋, 持竖立锄头, 朴实疲惫。",
    "npc_elder": "老者: 消瘦老人, 白发白须满脸皱纹, 深色长袍, 单手拄木杖, 慈祥疲惫。",
    "npc_child": "孩童: 约6岁小孩, 圆脸大眼天真, 朴素便装, 双手放松, 略带戒备的期盼神情。",
    "npc_woman": "现代女性NPC: 30岁知性女性, 短发, 深色西装外套+衬衫, 及膝铅笔裙, 提小包, 端庄。",
}


def main():
    args = sys.argv[1:]
    stage, slug = args[0], args[1]
    variant = args[2] if len(args) > 2 else None
    setting = SETTING.get(slug, slug)
    if stage == "raw":
        fn = "%s.png" % slug if not variant else "%s_%s.png" % (slug, variant)
        img = os.path.join(RAW, fn)
    else:
        base = slug if not slug.startswith("npc_") else slug[len("npc_"):]
        img = os.path.join(DEPLOY, "npc_%s.png" % base)
    js, raw = ask(img, stage, slug, retries=15, patient=True)
    out_md = os.path.join(OUT, "%s_%s.md" % (stage, slug))
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC %s: %s\n\n**文件**: `%s`\n\n" % (stage, slug, img))
        f.write("**设定**: %s\n\n" % setting)
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    verdict = "PASS" if (js and '"pass": true' in js) else ("FAIL" if js else "ERROR")
    print("QC %s %s verdict=%s -> %s" % (stage, slug, verdict, out_md), flush=True)
    sys.exit(0 if verdict == "PASS" else 1)


if __name__ == "__main__":
    main()
