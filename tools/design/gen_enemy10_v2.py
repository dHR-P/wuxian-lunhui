# -*- coding: utf-8 -*-
"""gen_enemy10_v2.py — 10 通用怪物 第2轮修正生成（tokenthythm wan2.7-image）。
修正 v1 质检 FAIL 的共性根因：
  · 内发光/魂火/红纹/巨眼等发光元素普遍外泄成光晕污染黑底 → 全部改哑光不发光或极弱体表高光；
  · 龙/恶魔翅膀普遍展开 → 强制双翼完全收拢贴身；
  · 背景被画地面/渐变/阴影、脚未贴底裁切 → 强化绝对纯黑与脚掌贴底裁切；
  · 杀手/吸血鬼/独角 主体不完整或未贴底 → 全身从头到脚、脚掌压住画面底缘被裁切。
用法: <comfy-python> gen_enemy10_v2.py [slug ...]
输出: tools/design/raw_enemy10/<slug>_v2.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy10")
os.makedirs(OUT_DIR, exist_ok=True)

BG_V2 = (
    "Background: absolutely flat solid pure black (#000000) filling ALL of the frame and every "
    "corner, completely empty, no floor, no ground plane, no ground shadow, no reflected light, "
    "no gradient, no fog, no mist, no particles, no vignette. Figure occupies the full height: "
    "head near top edge, feet (or lowest limbs) pressed down to and cropped by the very bottom "
    "frame edge, full body visible from head to feet. Absolutely NO glow, NO halo, NO rim light, "
    "NO outline, NO contour, NO white edge, NO luminous bleed, NO light spill around the figure — "
    "every bright detail stays fully inside the body silhouette, the subject is flat matte dark and "
    "never self-illuminating. Clean hard cut edge against the black. "
    "背景绝对整幅纯黑实心无任何地表/渐变/雾/投影/辉光, 双脚/下肢末端压住并裁切进画面最底缘, 全身从头到脚完整; "
    "主体哑光暗色, 任何亮部全部收敛在剪影内部, 绝无外发光/描边/白缘/光晕外泄, 边缘干净硬边利于抠图"
)


def v2_slug(slug):
    """返回 (文件名, prompt主体部分)；ov=原版本，仅在需要时参考。"""
    body = {
        "enemy_dragon": (
            "dark fantasy elder dragon standing on two clawed hind legs, BOTH dark leathery wings "
            "fully folded tight against its back and sides (closed, not spread, not open), pitch-black "
            "matte jagged scales only, long spiked tail low, small bony head with a closed dark maw, "
            "eyes dark matte stone (no glow), chest a dark dull ember-red facet that does NOT emit light, "
            "matte body lit by one faint cold key light, menacing crouched stance. "
            "暗黑魔幻巨龙跪伏站立, 双翼完全收拢紧贴身侧不展开, 墨黑哑光鳞甲, 长尾拖地, 闭口, 眼为暗哑石色不发光, 胸口暗淡红面极弱不外泄, 哑光暗色威慑姿态"
        ),
        "enemy_demon": (
            "dark demonic fiend standing, muscle-bound humanoid, short thick black horns, BOTH black bat "
            "wings fully folded tight against its back (closed, not spread), long barbed tail, matte "
            "ash-maroon skin with very faint dull dark-ember veins only on the surface (no shine, no glow, "
            "no light), dark knife-like claws, fangs in a shut mouth, eyes dark matte, lit by one faint cold "
            "side key light, looming menacing stance. "
            "暗黑恶魔直立, 短粗犷犄角, 双黑蝠翼完全收拢贴背不展开, 长勾尾, 哑光暗褐红皮上仅极暗蚀纹(无光泽无发光), 利爪獠牙闭嘴, 眼暗哑, 威慑高立姿"
        ),
        "enemy_undead": (
            "undead skeletal warrior standing, aged matte pale-bone skeleton with tattered ruined armor "
            "scraps, hollow dark empty eye sockets with NO light inside (no soul-fire, no glow, dark void), "
            "right hand holding a snapped broken blade, cracked ribs, matte pale bone, lit by one faint cold "
            "key light, grim menacing stance. "
            "亡灵骷髅直立站姿, 哑光白骨与破旧铠甲残片, 空洞眼眶内完全无光纯黑(无魂火无发光), 手持断折刀, 断肋, 哑光, 鬼气森森威慑姿"
        ),
        "enemy_golem": (
            "ancient stone golem towering standing figure of cracked gray mossy granite boulders, huge flat "
            "stone fists, matte rock surface with faint gray-darker seams (no glowing cracks, no light, no "
            "ember), flat monolithic blank face, heavy monumental hunched stance, fully matte gray-brown "
            "stone lit by one faint cold key light. "
            "花岗岩巨魔像直立, 裂纹青灰巨石堆砌, 巨拳扁平, 岩面哑光石缝全为灰暗色不发光, 平板无表情巨脸, 厚重如山立姿, 哑光岩石仅受一束淡冷光照亮"
        ),
        "enemy_oni": (
            "Japanese oni demon standing, brawny matte crimson-skinned ogre, TWO SHORT thick straight horns "
            "on its head, wild dark hair, fierce fanged grimace with mouth open, dark indigo loincloth, one "
            "massive iron-studded kanabo club shouldered, feet pressed to and cropped by the bottom frame "
            "edge, matte dark skin lit by one faint cold key light, intimidating stance. "
            "日式赤鬼直立, 魁梧哑光红肤, 头顶一双粗短直犄角(不可太长), 乱蓬黑发獠牙怒目, 深蓝裤衩, 肩扛巨型铁铆钉狼牙棒, 双脚压住画面最底缘, 哑光暗色威吓立姿"
        ),
        "enemy_cyborg": (
            "dark sci-fi cyborg standing, half-machine humanoid with exposed carbon framework and riveted "
            "gray steel armor plates, chest has a dark molten-red core FACET (surface only, no external glow, "
            "no light bleed), eyes are dark dim cyan slits that do not emit light, hydraulic joints, gripping "
            "claw hands, matte dark metal lit by one faint cold key light, cold menacing stance. "
            "科幻改造人直立, 半机械人形, 外露碳纤维骨架铆接钢甲板, 胸口暗红核心仅为体表磨砂面不发一辉光, 眼部暗青发光缝极弱不外泄, 液压关节利爪手, 哑光暗金属, 冷峻威慑立姿"
        ),
        "enemy_slasher": (
            "horror masked slasher standing FULL LENGTH from head to feet, tall menacing figure in a plain "
            "dark grimy work jacket and dark trousers, featureless matte white hockey mask, right hand "
            "holding ONE long rusted machete, left hand empty and relaxed, feet pressed to and cropped by "
            "the bottom frame edge, matte dark clothing and mask lit by one faint cold key light, towering "
            "oppressive stance. "
            "恐怖面具杀手全身从头到脚完整站立, 高大人形, 灰旧深色工装长衣裤, 惨白哑光素面冰球面具, 右手仅持一把长锈砍刀左手空手, 双脚压住画面最底缘, 哑光暗色调, 压迫高立姿"
        ),
        "enemy_vampire": (
            "aristocratic vampire lord standing FULL LENGTH, gaunt pale nobleman in an antique black "
            "high-collared coat with a long black cloak draped from shoulders to the floor, slicked dark hair, "
            "MATTE dark-red pupils that do not shine or glow, cold set mouth with faint fangs barely showing, "
            "one hand holding a single dull dark-red gem, feet pressed to and cropped by the bottom frame "
            "edge, matte muted palette lit by one faint cold key light, haughty menacing stance. "
            "吸血鬼贵族全身从头到脚完整站立, 消瘦苍白, 复古黑领礼服长黑披风曳地, 背头黑发, 暗哑血红瞳不反光不发光, 抿嘴微露獠牙, 手持一枚哑光暗红宝石, 双脚压住画面最底缘, 哑光暗色调, 倨傲威慑立姿"
        ),
        "enemy_werewolf": (
            "feral werewolf standing hunched FULL LENGTH, hulking wolf-man with matted dark-furred torso and "
            "long snouted muzzle, MATTE dark-amber eyes that do not glow or shine, fangs bared in a shut-ish "
            "muzzle, huge clawed hands and feet, shredded dark clothing tatters, feet pressed to and cropped "
            "by the bottom frame edge, matte dark fur lit by one faint cold key light, threatening stance. "
            "狼人全身从头到脚完整佝偻站立, 巨狼人黑乱粗毛躯干长吻, 暗哑琥珀竖瞳不发光不反光, 獠牙外翻咬合, 巨大利爪手足, 撕破衣, 双脚压住画面最底缘, 哑光暗毛, 威胁立姿"
        ),
        "enemy_tentacle": (
            "eldritch tentacle horror standing, a dark aberrational mass of thick tapering slick matte "
            "black-purple tentacles rising from a lumpy torso, many wriggling tentacles with gray sucker "
            "pads, a single DARK dull cyclopean eye deeply set in the mass that does NOT glow or emit light "
            "or shine (matte, no white, no glow), matte wet sheen WITHOUT any glow, lowest tentacle tips "
            "pressed to and cropped by the bottom frame edge, matte dark-lit by one faint cold key light, "
            "threatening crouch. "
            "克苏鲁触手怪直立, 暗紫黑滑腻触手攒聚, 众多粗壮渐细触手满布灰吸盘, 中央深嵌一只暗哑呆滞独眼完全不发光不反光(无白无光), 湿滑但无任何发光, 最下方触手端压住画面最底缘, 哑光暗紫, 威胁姿态"
        ),
    }
    return body[slug]


ALL = ["enemy_dragon", "enemy_demon", "enemy_undead", "enemy_golem", "enemy_oni",
       "enemy_cyborg", "enemy_slasher", "enemy_vampire", "enemy_werewolf", "enemy_tentacle"]


def run(wanted):
    targets = wanted or ALL
    for slug in targets:
        if slug not in ALL:
            continue
        out = os.path.join(OUT_DIR, "%s_v2.png" % slug)
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        prompt = v2_slug(slug) + BG_V2
        print(">>> v2 generating %s" % slug, flush=True)
        ok = gen(prompt, "768x1024", out)
        print("RESULT v2 %s: %s" % (slug, "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run(sys.argv[1:])
