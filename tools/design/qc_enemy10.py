# -*- coding: utf-8 -*-
"""qc_enemy10.py — 10 种通用怪物立绘质检（qwen3.7-flash，任务指定）。
复用 qc_enemy8.ask（qwen3.7-flash, data URL base64, max_tokens 4000, 耐心退避）。
用法: <comfy-python> qc_enemy10.py raw|cut <slug>
输出: tools/design/qc_enemy10/<stage>_<slug>.md
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qc_enemy8 import ask  # noqa: E402

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy10"
DEPLOY = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_enemy10"
os.makedirs(OUT, exist_ok=True)

# slug -> 正式设定
SETTING = {
    "enemy_dragon": "魔幻巨龙: 双足直立的暗黑魔幻龙, 墨黑鳞甲, 收拢暗色革翼长钉尾, 眼与胸口暗红内光不外泄, 狰狞立姿。",
    "enemy_demon": "暗黑恶魔: 高大肌肉型人形魔物, 短犄角, 收拢黑蝠翼, 长勾尾, 暗褐红皮, 利爪獠牙, 皮面暗红血纹内发光不外泄, 威慑立姿。",
    "enemy_undead": "亡灵骷髅: 直立站姿骷髅兵, 破旧铠甲残片, 空洞眼眶内冷蓝魂火不外泄, 手持断刃, 哑光白骨, 鬼气森森。",
    "enemy_golem": "花岗岩石魔像: 裂纹青灰巨石堆砌的人形, 巨岩拳, 岩缝暗琥珀热纹内发光不外泄, 平板巨脸, 厚重如山立姿, 哑光岩石。",
    "enemy_oni": "日式赤鬼: 魁梧赤肤恶鬼, 一双短犄角, 乱发獠牙怒目, 腰缠布, 肩扛巨大狼牙棒, 威吓立姿。",
    "enemy_cyborg": "科幻改造人: 半机械人形生物装甲, 外露碳纤维骨架铆接钢甲板, 胸口红核心与眼部青指示光仅体表内发光不外泄, 液压关节利爪手, 冷峻立姿, 哑光金属。",
    "enemy_slasher": "恐怖面具杀手: 高大人形, 灰旧深色工装长衣裤, 惨白素面冰球面具, 手持锈蚀长砍刀, 血污衣料, 整体暗沉, 压迫高立姿。",
    "enemy_vampire": "吸血鬼贵族: 消瘦苍白美男, 复古黑领礼服曳地黑披风, 血红瞳(体表微光不外泄), 獠牙, 手持血红宝石, 倨傲威慑立姿, 暗调。",
    "enemy_werewolf": "狼人: 佝偻伏身巨狼人, 乱黑粗毛躯干长吻, 琥珀竖瞳(体表微光不外泄), 獠牙外翻, 巨大利爪手足, 撕破衣, 威胁立姿。",
    "enemy_tentacle": "克苏鲁触手怪: 暗紫黑滑腻触手攒聚直立怪物, 粗壮渐细触手众多满布灰吸盘, 中央深嵌脉动独眼仅体内微亮不外泄, 湿滑滴液, 威胁姿态。",
}


def main():
    args = sys.argv[1:]
    stage, slug = args[0], args[1]
    variant = args[2] if len(args) > 2 else None  # e.g. "v2" -> raw_enemy10/<slug>_v2.png
    setting = SETTING.get(slug, slug)
    if stage == "raw":
        fn = "%s.png" % slug if not variant else "%s_%s.png" % (slug, variant)
        img = os.path.join(RAW, fn)
    else:
        # 兼容带 enemy_ 前缀的 slug
        base = slug if not slug.startswith("enemy_") else slug[len("enemy_"):]
        img = os.path.join(DEPLOY, "enemy_%s.png" % base)
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
