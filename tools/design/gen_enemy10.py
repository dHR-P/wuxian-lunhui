# -*- coding: utf-8 -*-
"""gen_enemy10.py — 10 种通用怪物立绘生成（tokenrhythm wan2.7-image，768x1024）。
用法: <comfy-python> gen_enemy10.py [slug ...]
输出: tools/design/raw_enemy10/<slug>.png
纯黑底+全身贴底+禁外泄白晕，供 floodfill 抠图。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy10")
os.makedirs(OUT_DIR, exist_ok=True)

# 统一背景配方：绝对纯黑、全身贴底、硬边无辉光外泄
CLEAN_BG = (
    "full body, standing centered, figure large filling nearly all frame height, "
    "the feet and lower body cropped by the bottom frame edge (feet NOT fully visible). "
    "No outline, no contour line, no edge glow, no halo, no light spill around the "
    "figure anywhere — clean hard cut edge, no bright border, no white rim, no glowing "
    "aura, no corner vignette, no radiant bleed into the black. "
    "All four corners are absolutely flat solid pure black. Entire background is uniform "
    "flat solid pure black (#000000) with no fog, no mist, no smoke, no glow, no reflection, "
    "no ground plane, no shadow, no gradient. The figure is dimly lit by one faint cold "
    "side key light so it is clearly separable from the black but never glows. matte dark, "
    "high detail, sharp, consistent lighting. "
    "全身放大居中占满画面高度, 双脚与下摆紧贴画面底缘被轻微裁切; 主体整体偏暗哑光, 绝无轮廓勾边/描边/辉光/白边/外泄光晕/光污染, "
    "四角与全画面绝对整幅纯黑实心, 无雾无灰霾无地表无投影无渐变, 边缘干净硬边利于抠图"
)

# 中文主题 + 英文主体描述（帮助 wan 理解怪物设定）
MONSTERS = [
    {
        "slug": "enemy_dragon",
        "theme": "魔幻巨龙",
        "prompt": (
            "dark fantasy elder dragon, horned serpentine dragon standing on two clawed "
            "hind legs with folded dark leathery wings and a long spiked tail, pitch-black "
            "jagged scales, glowing ember-orange slits eyes and chest core faint inner "
            "glow ONLY inside the body silhouette (NO external glow), open fanged maw, "
            "muscular dark body, menacing hero-pose. "
            "暗黑魔幻巨龙: 双足直立, 收拢的暗色革翼与长钉尾, 墨黑鳞甲, 眼与胸口只有体内暗红内光(绝不外泄), 狰狞口齿, 压迫感立姿。"
        ),
    },
    {
        "slug": "enemy_demon",
        "theme": "暗黑恶魔",
        "prompt": (
            "dark demonic fiend, towering muscle-bound humanoid with sharp stubby black "
            "horns, large swept-back bat-like black wings, long barbed tail, ash-maroon "
            "rippling skin, knife-like claws, fanged sneer, faint ember veins on skin glowed "
            "only inside silhouette (NO external light), cloaked in shadow, menacing. "
            "暗黑恶魔: 高大肌肉人形魔物, 短粗犷犄角, 收拢黑蝠翼, 长勾尾, 暗褐红岩皮, 利爪獠牙, 皮面暗红血纹内发光不外泄, 威慑立姿。"
        ),
    },
    {
        "slug": "enemy_undead",
        "theme": "亡灵骷髅",
        "prompt": (
            "undead skeletal warrior standing, aged white bone skeleton with tattered "
            "ruined armor scraps, hollow dark eye sockets with a faint cool blue will-o-wisp "
            "flame ONLY inside the sockets (NO external glow), broken rusted blade in hand, "
            "cracked ribs and spine, fleshless grim reaper vibe, matte dark bone. "
            "亡灵骷髅: 直立站姿的骷髅兵, 破旧铠甲残片, 空洞眼眶内只有一缕极淡冷蓝魂火(绝不外泄), 手持断刃, 暗哑骨质, 鬼气森森。"
        ),
    },
    {
        "slug": "enemy_golem",
        "theme": "石魔像",
        "prompt": (
            "ancient stone golem towering standing figure made of cracked gray mossy "
            "granite boulders and masonry, huge stone fists, glowing amber-fissure veins "
            "heating from hip stone cracks only inside silhouette (NO external glow), "
            "flat monolithic blank face, heavy hunched monumental stance, matte rock. "
            "花岗岩石魔像: 由裂纹青灰巨石堆砌的巨大人形, 巨岩拳, 岩石隙缝仅有暗琥珀热纹内发光不外泄, 平板无表情巨脸, 厚重如山立姿, 哑光岩石质感。"
        ),
    },
    {
        "slug": "enemy_oni",
        "theme": "日式鬼怪",
        "prompt": (
            "Japanese oni demon ogre standing, brawny crimson-skinned demon with two "
            "small straight horns, wild black hair, fierce fanged grimace, loincloth, holding "
            "a massive kanabo iron-studded club, dark indigo loincloth, pounding intimidating "
            "stance. 日式赤鬼: 魁梧赤肤恶鬼, 一双短犄角, 乱发獠牙怒目, 腰挞缠布, 肩扛巨大狼牙棒, 威吓立姿, 哑光暗色。"
        ),
    },
    {
        "slug": "enemy_cyborg",
        "theme": "科幻改造人",
        "prompt": (
            "dark sci-fi cyborg shell standing, half-humanoid machine with exposed carbon "
            "framework, riveted steel plates, glowing red core and dim cyan optical visor "
            "lamp glowed ONLY on the surface inside silhouette (NO external glow), hydraulic "
            "servo joints, gripping claw hands, ominous standing pose, matte dark metal. "
            "科幻改造人生物装甲: 半机械人形, 外露碳纤维骨架与铆接钢甲板, 胸口红色核心与眼部青色指示灯只在体表内发光不外泄, 液压关节, 利爪手, 冷峻立姿, 哑光暗金属。"
        ),
    },
    {
        "slug": "enemy_slasher",
        "theme": "面具杀手",
        "prompt": (
            "horror masked slasher standing, menacing tall figure in plain dark grimy "
            "work jacket and trousers, featureless pale white plastic hockey mask, one "
            "sleeve gripping a long rusted machete, red-stained knife and spattered cloth, "
            "shadowed mostly black, towering oppressive stance. "
            "恐怖面具杀手: 高大人形, 灰旧深色工装长衣裤, 惨白素面冰球面具(无表情), 手持锈蚀长砍刀, 血污衣料, 整体阴郁近黑, 压迫高立姿, 哑光。"
        ),
    },
    {
        "slug": "enemy_vampire",
        "theme": "吸血鬼族",
        "prompt": (
            "aristocratic vampire lord standing, gaunt pale nobleman in an antique black "
            "high-collared coat with flowing cloak draped to the ground, slicked dark hair, "
            "blood-red pupiled eyes with faint cold crimson glint only on surface (NO external "
            "glow), long pale fanged smile, one hand in cloak the other holding a wine-red gem, "
            "haughty menacing stance. "
            "吸血鬼贵族: 消瘦苍白俊美, 复古黑领礼服与曳地黑披风, 背头黑发, 血红瞳(体表微光不外泄), 獠牙冷笑, 手藏披风手持血红宝石, 倨傲威慑立姿, 哑光暗调。"
        ),
    },
    {
        "slug": "enemy_werewolf",
        "theme": "狼人",
        "prompt": (
            "feral werewolf standing hunched, hulking wolf-man with matted dark-furred "
            "torso and long snouted muzzle, glowing amber slit eyes with faint glint only "
            "on the surface (NO external glow), fangs bared, huge clawed hands and feet, "
            "ripped dark clothing tatters, four-legged-crouch-to-two-legged threatening stance. "
            "狼人: 佝偻伏身的巨狼人, 乱黑粗毛躯干与长吻, 琥珀竖瞳(体表微光不外泄), 獠牙外翻, 巨大利爪手足, 撕裂破衣, 龇牙威胁立姿, 哑光暗色。"
        ),
    },
    {
        "slug": "enemy_tentacle",
        "theme": "克苏鲁触手怪",
        "prompt": (
            "eldritch tentacle horror standing, a dark aberrational mass of thick tapering "
            "slick black-purple tentacles rising from a lumpy torso-peduncle, many wriggling "
            "tentacles with gray sucker pads, a single pulsing cyclopean eye faintly lit deep "
            "inside the mass (NO external glow), dripping, crouching menacing. "
            "克苏鲁触手怪: 暗紫黑滑腻触手攒聚的畸形直立体, 粗壮渐细触手众多, 布满灰吸盘, 中央一颗深嵌脉动独眼仅在体内微亮不外泄, 湿滑滴液, 匍匐威胁姿态, 哑光暗紫。"
        ),
    },
]


def run(wanted):
    for m in MONSTERS:
        if wanted and m["slug"] not in wanted:
            continue
        out = os.path.join(OUT_DIR, m["slug"] + ".png")
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        prompt = m["prompt"] + CLEAN_BG
        print(">>> generating %s (%s)" % (m["slug"], m["theme"]), flush=True)
        ok = gen(prompt, "768x1024", out)
        print("RESULT %s: %s" % (m["slug"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run(sys.argv[1:])
