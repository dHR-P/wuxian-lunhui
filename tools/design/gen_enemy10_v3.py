# -*- coding: utf-8 -*-
"""gen_enemy10_v3.py — 通用怪物 第3轮修正（最终轮，≤2 次重试达标）。
第2轮 FAIL 核心: QC 判据要求「冷白偏蓝 rim light 硬边」+「脚掌贴底裁切」，
而 v2 过度禁用 rim 导致 edges=0 / 背景软灰导致 bg 低。本轮统一配方:
  · 紧贴剪影外缘的一圈冷白偏蓝 rim light(细而硬, 严格在轮廓上, 绝不外泄扩散成晕/白雾);
  · 脚掌/最低肢体死死压住并裁切进画面最底缘, 脚下绝不留黑隙;
  · 哑光暗色主体, 内部任何亮部(眼/核心/纹路/宝石)一律哑光不发光不外泄;
  · 背景绝对整幅纯黑。
用法: <comfy-python> gen_enemy10_v3.py [slug ...]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy10")
os.makedirs(OUT_DIR, exist_ok=True)

BG_V3 = (
    "Background: absolutely flat solid pure black (#000000) filling every corner of the frame, "
    "completely empty and featureless, no floor, no ground plane, no ground shadow, no reflected "
    "light, no gradient, no haze, no fog, no mist, no particles, no vignette. Figure fills the "
    "full height: head close to the top edge and feet (or lowest limbs) PUSHED HARD AGAINST THE "
    "VERY BOTTOM FRAME EDGE and cropped by it so there is NO black space left under them. "
    "Around the outer silhouette there is ONE thin crisp cool pale-blue rim light that hugs the "
    "edge tightly and stays right ON the figure — it must NOT diffuse, bloom, glow, or bleed "
    "outward into the surrounding black (no halo, no white mist, no spill). Every other bright "
    "detail (eyes, core, veins, gem) is flat matte dark and non-luminous. Hard clean separation "
    "from background. "
    "背景绝对整幅纯黑, 无地表/投影/反光/渐变/雾晕, 双脚或最低肢体死死压住画面最底缘并被裁切、脚下绝无黑隙; "
    "剪影外缘只有一圈细而硬的冷白偏蓝轮廓光紧贴主体、绝不外泄扩散成光晕白雾; 主体其余部分哑光暗色, 内部亮部一律不发光; 边缘干净利于抠图"
)


def B(slug):
    return {
        "enemy_dragon": (
            "a dark fantasy elder dragon standing UPRIGHT ON TWO clawed hind legs (bipedal stance, "
            "NOT on four legs), pitch-black matte scales, both dark leathery wings FOLDED TIGHT "
            "closed against the back (not spread, not raised), long spiked tail trailing low, "
            "small horned head with a closed dark maw, eyes are matte dark stone (no glow), chest "
            "is matte dark with NO glow, dark matte body lit only by the thin cool rim light, "
            "menacing vigilant stance. 暗黑魔幻巨龙双足直立(非四足), 墨黑哑光鳞甲, 双革翼完全收拢贴背不展开, 长钉尾拖地, 闭嘴, 眼与胸口哑光暗色无任何发光, 威慑警戒立姿"
        ),
        "enemy_demon": (
            "a tall imposing dark fantasy demonic male figure standing UPRIGHT, matte ash-maroon "
            "sculpted hide with very faint darker patterning (no shine, no glow), short thick "
            "dark horns on the head, both dark wings FULLY FOLDED tight and closed against the "
            "back (not spread), long tail, a single broadsword held at his side, calm thunderous "
            "unmoving stance, dark eyes, hands relaxed, full body, epic dark matte concept art. "
            "高大暗黑奇幻恶魔男子直立, 哑光灰褐皮革缀暗细纹(无光泽无发光), 粗短深色犄角, 双翼完全收拢贴背不展开, 长尾, 一手侧握阔剑, 沉稳威慑站姿, 暗哑眼睛, 暗色哑光概念立绘"
        ),
        "enemy_undead": (
            "an undead skeletal warrior standing UPRIGHT, aged matte pale-bone skeleton, tattered "
            "ruined armor scraps, DARK HOLLOW EMPTY eye sockets with no light inside (just black "
            "void, no soul-fire, no glow), right hand holding one snapped broken blade, cracked "
            "ribs, matte pale bone lit only by the thin cool rim light, grim unmoving stance. "
            "亡灵骷髅直立站姿, 哑光白骨与破旧铠甲残片, 眼眶空洞纯黑内无任何光(无魂火无发光), 右手仅持一把断折刀, 断肋, 哑光, 鬼气威慑站姿"
        ),
        "enemy_golem": (
            "an ancient stone golem STANDING UPRIGHT and monolithic, made of cracked gray mossy "
            "granite boulders, huge flat stone fists, matte gray-brown rock with dark gray "
            "seam lines only (no glowing cracks, no light), flat blank monolithic face, heavy "
            "monumental rock body, fully matte stone lit ONLY by the thin cool rim light, "
            "immovable stance. 花岗岩巨魔像直立如山, 裂纹青灰巨石堆砌, 巨拳扁平, 岩面哑光灰褐、石缝仅为暗灰线绝无发光, 平板无表情巨脸, 哑光岩石仅受细冷轮廓光, 稳重威立姿"
        ),
        "enemy_oni": (
            "a Japanese oni ogre standing UPRIGHT, brawny matte crimson-skinned demon with TWO "
            "SHORT thick straight horns on the forehead, wild dark unkempt hair, fierce fanged "
            "grimace, dark indigo loincloth, one massive iron-studded kanabo club resting on his "
            "shoulder, thick strong hands, feet PUSHED HARD flat against the bottom frame edge, "
            "matte dark skin lit only by the thin cool rim light, intimidating stance. "
            "日式赤鬼直立, 魁梧哑光赤肤, 头顶一双粗短直犄角, 乱蓬黑发獠牙怒目, 深蓝裤衩, 巨型铁铆狼牙棒搭肩, 粗壮双手, 双脚死死平压画面最底缘, 哑光红肤仅受细冷轮廓光, 威吓立姿"
        ),
        "enemy_slasher": (
            "a horror masked slasher standing UPRIGHT FULL LENGTH from head to feet, tall menacing "
            "figure in a plain dark grimy work jacket and dark trousers, featureless matte white "
            "hockey mask, right hand holding ONE long rusted machete, left hand relaxed empty, "
            "feet PUSHED HARD FLAT against the very bottom frame edge, matte dark clothing lit "
            "only by the thin cool rim light, towering oppressive stance. "
            "恐怖面具杀手全身从头到脚直立完整, 高大人形, 灰旧深色工装长衣裤, 惨白哑光素面冰球面具, 右手仅持一把长锈砍刀左手空手, 双脚死死平压画面最底缘, 哑光暗衣仅受细冷轮廓光, 压迫高立姿"
        ),
        "enemy_vampire": (
            "a gaunt pale aristocratic vampire lord standing UPRIGHT FULL LENGTH, antique black "
            "high-collared coat and a long black cloak draping from shoulders to the floor, "
            "slicked dark hair, MATTE dark-red pupils that do not shine or glow, mouth set with "
            "faint fangs, one hand holding a single dull dark-red gem, feet and coat hem PUSHED "
            "HARD against the bottom frame edge and cropped, matte muted palette lit only by the "
            "thin cool rim light, haughty menacing stance. "
            "消瘦苍白吸血鬼贵族全身直立完整, 复古黑领礼服与长黑披风曳地, 背头黑发, 暗哑血红瞳不反光不发光, 抿嘴微露獠牙, 一手持一枚哑光暗红宝石, 双脚与袍摆死死压住画面最底缘, 哑光暗调仅受细冷轮廓光, 倨傲威慑立姿"
        ),
    }[slug]


ALL = ["enemy_dragon", "enemy_demon", "enemy_undead", "enemy_golem", "enemy_oni",
       "enemy_slasher", "enemy_vampire"]


def run(wanted):
    targets = wanted or ALL
    for slug in targets:
        if slug not in dict.fromkeys(ALL):
            continue
        out = os.path.join(OUT_DIR, "%s_v3.png" % slug)
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        prompt = B(slug) + BG_V3
        print(">>> v3 generating %s" % slug, flush=True)
        ok = gen(prompt, "768x1024", out)
        print("RESULT v3 %s: %s" % (slug, "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run(sys.argv[1:])
