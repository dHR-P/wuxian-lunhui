# -*- coding: utf-8 -*-
"""gen_jianzhong_scenes.py — 剑冢禁地 4 层场景背景空镜生成。
依据 jianzhong.md §9.3: L1山门古道雾景/L2埋剑长廊/L3剑冢深谷/L4无名剑碑之巅。
空镜, 禁人物。宽幅横屏 1024x768。
输出: tools/design/raw_jianzhong/jz_bg_*.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

NO_PERSON = (
    "空镜, 无人物, 无角色, 无人, 无生物。纯场景环境, 无文字, 无水印, 无logo。"
    "Wide empty scenic establishing shot, no characters, no people, no figures, no "
    "creatures anywhere. Pure environment setting, no text, no watermark, no logo."
)

SCENES = [
    {
        "name": "jz_bg_l1_shanmen",
        "prompt": (
            "武侠门派禁地山门古道雾景: 青灰石坊旧牌坊立在灰雾古道中央, 两侧残破石阶与青苔巨石, "
            "枯树与断碑散布路旁, 冷灰雾霭从山谷涌出笼罩一切, 低饱和冷调铁灰青灰, 肃穆沉寂。"
            "远景群山隐入浓雾。"
            + NO_PERSON
        ),
    },
    {
        "name": "jz_bg_l2_changlang",
        "prompt": (
            "千年埋剑长廊内景: 笔直长廊两侧沿墙整齐插着一排排古剑, 锈青铜与暗铁色剑身, "
            "剑柄缠旧布, 廊顶幽暗青石, 微弱锈色微光与青灰冷光从剑隙透出, 地面石板湿而反光, "
            "纵深透视延伸向远处, 孤寂阴冷, 低饱和冷调。"
            + NO_PERSON
        ),
    },
    {
        "name": "jz_bg_l3_shengu",
        "prompt": (
            "幽暗剑冢深谷: 两侧高耸陡峭谷壁呈暗铁灰色, 谷底散布大小石冢与残碑剪影, "
            "层层枯剑插在土中, 冷雾在谷底流动, 微弱青灰天光从谷顶一线洒下, "
            "深谷压迫感, 石冢残碑剪影层叠, 低饱和暗调。"
            + NO_PERSON
        ),
    },
    {
        "name": "jz_bg_l4_jianbei",
        "prompt": (
            "剑冢最深处无名剑碑之巅: 一座巨大的无名巨碑立于夕照之下, 夕照斜光如熔金泼满碑身, "
            "碑身留有道道剑痕与无字刻痕, 四周插满成千上万的枯剑, 万剑低鸣的氛围, "
            "夕照金红色暖光与铁青冷雾交叠, 庄严悲壮, 黄金时刻。"
            + NO_PERSON
        ),
    },
]


def run():
    for s in SCENES:
        out = os.path.join(OUT_DIR, s["name"] + ".png")
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        print(">>> generating %s" % s["name"], flush=True)
        ok = gen(s["prompt"], "1024x768", out)
        print("RESULT %s: %s" % (s["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()