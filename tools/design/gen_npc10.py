# -*- coding: utf-8 -*-
"""gen_npc10.py — 10 类高频职业型 NPC 通用立绘生成（wan2.7-image, 768x1024）。
每个生图输出 tools/design/raw_npc10/<slug>[_vN].png。
用法: <comfy-python> gen_npc10.py [slug]   # 不带参数 = 全部 v1
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_npc10")
os.makedirs(RAW, exist_ok=True)

# 通用后缀：纯黑平底 + 贴底 + 硬边禁白晕（为 floodfill 抠图安全）
# 注意：与 wan_prompts.md 的冷白 rim light 相反，任务要求「禁外泄白晕、边缘硬边」，
# 故这里不强调发光描边，反而要求主体本身被正前光亮、轮廓清晰硬边、零发光外泄。
SUFFIX = (
    "Standing centered full body portrait, showing head to feet, "
    "feet soles touching the very bottom edge of the frame (soles cropped "
    "slightly by the bottom frame edge). Background: flat pure black, absolutely "
    "uniform matte black, NO floor reflection, NO ground shadow, NO light gradient, "
    "NO glow, NO haze, no visible ground plane, nothing behind the character. "
    "The character is lit by an even cool front key light, clearly brighter than the "
    "background, silhouette has clean hard edges; absolutely NO white glow, NO white "
    "outline, NO rim-light halo bleeding into the black background, no stray white "
    "specks. High detail, sharp, single character, full body within the frame."
)

# slug -> 正式设定 prompt（职业 NPC；中文设定词用于 QC，英文 prompt 用于生图）
PROMPTS = {
    "npc_guard": "A serious professional security guard, adult Asian man, wearing a dark-blue "
                 "security guard uniform with badge and shoulder patches, black peaked cap, "
                 "holding a compact black pistol with both hands down at his sides (safely holstered "
                 "position, hands resting on the weapon at his waist), stern calm face. "
                 + SUFFIX,
    "npc_survivor": "A frightened civilian survivor, adult man in his 30s, wearing a torn and "
                    "stained dark jacket over a rumpled shirt, dirt and scratches on his face, "
                    "wide alarmed frightened eyes, cowering slightly with arms hugging his own "
                    "torso, clutching a small cloth bundle. " + SUFFIX,
    "npc_watcher": "A night watcher, lean adult figure, face shadowed inside a dark hood, wearing "
                   "a long hooded dark-gray cloak, holding an old iron oil lantern raised with one hand "
                   "at chest height, the lantern lit but its light contained within a small warm pool "
                   "that does not spread into the black background, calm wary posture. " + SUFFIX,
    "npc_merchant": "A shrewd merchant, middle-aged man, well-groomed, wearing a neat dark vest and "
                    "white shirt with a necktie, gold pocket watch chain, holding a small coin purse, "
                    "cunning calculating eyes, confident upright posture. " + SUFFIX,
    "npc_doctor": "A calm doctor, adult woman or man, wearing a clean white doctor coat over light "
                  "clothes with a stethoscope around the neck, holding a clipboard, professional "
                  "neutral expression. " + SUFFIX,
    "npc_soldier": "A combat soldier, adult man, wearing a dark-green military field uniform with "
                   "body armor vest and helmet, holding a rifle in both hands at chest level (muzzle "
                   "pointing up/away safely), alert stern face. " + SUFFIX,
    "npc_villager": "A simple villager, middle-aged man, wearing plain coarse farmer clothes, a straw "
                    "hat or cloth headwrap, worn cloth vest over a tunic, fabric trousers and straw "
                    "sandals, humble tired face, standing with a hoe held vertical. " + SUFFIX,
    "npc_elder": "A frail elderly man with short white hair and a long white beard, deep wrinkles, "
                 "wearing a simple long dark robe, leaning on a wooden walking staff held in one "
                 "hand, kind but weary face. " + SUFFIX,
    "npc_child": "A small young child, about 6 years old, round innocent face with big curious eyes, "
                 "wearing simple plain play clothes, standing with small hands relaxed, hopeful "
                 "slightly wary expression. " + SUFFIX,
    "npc_woman": "A modern professional woman, about 30, short neat hair, intelligent calm face, "
                 "wearing a fitted dark blazer over a blouse, knee-length pencil skirt, holding a "
                 "small handbag, poised upright posture. " + SUFFIX,
}

# 中文正式设定（QC 判据）
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
    targets = args if args else list(PROMPTS.keys())
    for slug in targets:
        if slug not in PROMPTS:
            print("skip unknown %s" % slug, flush=True)
            continue
        out = os.path.join(RAW, "%s.png" % slug)
        prompt = PROMPTS[slug]
        ok = gen(prompt, "768x1024", out)
        print("GENERATE %s -> %s" % (slug, "OK" if ok else "FAIL"), flush=True)
    print("ALL_DONE", flush=True)


if __name__ == "__main__":
    main()
