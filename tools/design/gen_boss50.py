# -*- coding: utf-8 -*-
"""gen_boss50.py — 为 12 个高辨识度 BOSS 生成专属立绘(纯黑底+全身贴底+冷白rim light), 供 floodfill 抠图。
管线:
  gen_boss50.py          生成全部 raw_boss50 (已有则跳过) → 产出 manifest
先跑这一步出图, 再人工/子代理跑 glm_qc 质检, PASS 后跑 cutout_boss50.py 抠图。
用法:  python gen_boss50.py [仅quote:按脚本全量]
输出: tools/design/raw_boss50/boss_<slug>.png  (768x1024)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_boss50")
os.makedirs(OUT_DIR, exist_ok=True)

# 通用立绘后缀 v2: 绝对平面纯黑背景 + 全身贴底缘 + **明确禁止白描边/背光晕**, 便于 flood-fill 抠图
# 教训: "cool white rim light" 会生成白色/灰白描边晕泄入黑底, 导致抠图白边。故强制关闭背光与边缘辉光。
REV2 = (
    "LARGE full body taking up over 90% of the image height, standing centered, "
    "feet and lower body touching the very bottom edge of the frame, the feet soles "
    "cropped slightly by the bottom frame edge. The whole body is evenly lit by a "
    "cool white key light from the front, clearly brighter than the background; no part "
    "of the body is the same color as the background. "
    "Background: absolutely flat pure black (#000000), uniform matte black, completely dark, "
    "NO reflection, NO shadow, NO gradient, NO glow, NO haze, no visible ground plane, NO "
    "back-light, NO rim-light, NO white or grey outline halo around the silhouette. The "
    "silhouette edges are crisp and hard against the pure black, body color reaches the edge "
    "directly with clean contrast. High detail, sharp, single character. "
    "全身站姿居中, 角色放大占满画面高度, 脚掌贴底缘被轻微裁切, 背景绝对平面纯黑无任何辉光白边"
)

# slug: (中文名, prompt 主题段落)
BOSSES = [
    ("sanjiaotou", "寂静岭三角头",
     "A towering Silent-Hill-style iron triangular-head boss figure: a huge rusted-metal "
     "triangular helmet over the head, a colossal triangular great-blade held at the side, "
     "a long tattered grey burial robe-hooded cloak covering the muscular body, dark ash-grey "
     "skin, faint dark-red accents on the blade and hem, upright statuesque menacing stance. "
     "烟雾蒸汽、压抑肃杀氛围. " + REV2),
    ("fulaidi", "猛鬼街弗莱迪",
     "A Nightmare-on-Elm-Street-style burned nightmare dream-demon: a humanoid figure with a "
     "severely burned scarred criss-cross face, wearing a razor-claw glove on one hand (four "
     "long blade claws), a dirty red-and-green striped pullover sweater, dark fedora hat "
     "shadowing the eyes, hunched grinning menace. emphasis atropos 恐怖诡异. " + REV2),
    ("yizhong", "异种成体",
     "A xenomorph-style adult alien organism: a tall pale hairless partially-translucent "
     "silvery biotechnoid humanoid, elongated skull head, internal rib-like exoskeleton over "
     "the torso, biological jointed armored tail, clawed hands, wet glossy membrane carapace, "
     "half-transparent pale cocoon membrane clinging to parts of the body, eerie extraterrestrial. "
     "冷白凝霜、生物恐怖. " + REV2),
    ("jixianti", "寄生前夜线粒体聚合体",
     "A Parasite-Eve-style mitochondrion aggregate organism: a writhing mass of thousands of "
     "thin translucent glowing tentacle-like mitochondria tendrils fused with raw flesh and "
     "cell tissue, a vague fleshy humanoid core at the center, faint icy-blue bioluminescent "
     "light pulsing through the cellular filaments, wet organic carnal horror, monstrous mass "
     "taking a looming fused-humanoid silhouette. 幽蓝冷光、血肉地狱. " + REV2),
    ("baojun", "生化暴君",
     "A Resident-Evil T-virus type-T tyrant giant: a huge grey-skinned towering bio-organic "
     "brute with exposed overgrown muscle fibers and sinew, small underdeveloped head, one "
     "oversized clawed fist, an exposed beating heart at the chest, tattered dark pants, "
     "raw brutal savage menace, standing full height fists clenched. 灰皮暴虐、恐怖巨汉. " + REV2),
    ("miwujuwu", "迷雾巨物",
     "A fog-veiled colossal Cthulhu-esque eldritch entity towering in dense grey mist: a "
     "gigantic shadowy silhouette of unknown shape glimpsed through swirling fog, several "
     "huge writhing tentacles glimpsed, deep unfathomable cosmic horror, formless "
     "inscrutable dread, barely-lit by cold pale rim light cutting through the mist around "
     "the titan limbs. 不可名状、克苏鲁雾中巨物. " + REV2),
    ("xingshiwang", "死雾镇雾中行尸王",
     "A rising zombie king in the death-mist town: an emaciated shambling corpse-fiend being "
     "swallowed by swirling black-grey death mist, tattered ragged clothes, partial rotting "
     "flesh, wisps of black mist coiling like snakes around the limbs and trailing from the "
     "body, hollow burning eye sockets, crowned with a crown-like void of black fog, dread "
     "undead menace. 灰雾吞噬、黑雾缠身、行尸之王. " + REV2),
    ("juanzhe", "沉没神殿旧神眷属",
     "A servant of an Old God from the sunken temple beneath the deep sea: a semi-translucent "
     "pale aquamarine eldritch being with a flank of writhing tentacles, webbed clawed limbs, "
     "a deep-dark-blue church-like garment of barnacles and coral, faint spectral glow, many "
     "unblinking eyes, fusing deep-sea cosmic horror and corrupted holy vestment. 海底旧神眷属、半透明. " + REV2),
    ("kuangxie", "函谷关箜邪",
     "A battlefield cursed war-crazed legion commander at a mountain pass: a towering "
     "barbaric warrior in crude ancient bronze-and-iron battle armor covered in dried blood "
     "and rust, a large horned or plumed helmet, a great blade or halberd, fierce martial "
     "aura of thousands of frenzied soldiers, blood-red war paint and ragged war banner, "
     "commanding undying battle-dread menace. 蛮荒铠甲、血色军团长. " + REV2),
    ("shourenchaowang", "无尽森林兽人战潮王",
     "An orc tide-war king of the endless forest: a colossal brutish orc giant clad in "
     "crude bone-plate armor lashed with sinew, thick tusks, glowing eyes, massive bone "
     "great-axe or war-club, scarred grey-green muscle, black killing-aura / suffocating "
     "ferocity radiating around him, looming war-god menace. 骨甲、煞气、兽人巨汉. " + REV2),
    ("jixieronghe", "天网机械融合体",
     "A skynet-style machine-flesh fusion entity: a biomechanical amalgam of cold dark-metal "
     "mechanical armor and wet organic muscle tissue fused together, glowing red single or "
     "twin optical sensors, exposed cables and blood vessels intertwined, hydraulic pistons "
     "and sinew, cold-industrial menace, looming war-machine humanoid. 机械+血肉融合、红眼冷金属. " + REV2),
    ("poxujiezhe", "破虚异界来者",
     "A transcendent realm-breaker invader from another dimension: a xianxia-style "
     "transcendent being whose over-body is a semi-transparent radiant afterglow of law and "
     "order violating the void, jagged spatial cracks shimmering around him, flowing ethereal "
     "xianxia robes fused with glowing golden-white void-light patterns, faint trailing "
     "stardust and swirling runes, serene yet awe-crushing otherworldly power. 仙侠跨界法则化身、半透明辉光. " + REV2),
]


def run():
    manifest = []
    for slug, zh, prompt in BOSSES:
        out = os.path.join(OUT_DIR, "boss_%s.png" % slug)
        status = "exists"
        if not os.path.exists(out):
            print(">>> generating boss_%s (%s)" % (slug, zh), flush=True)
            ok = gen(prompt, "768x1024", out)
            status = "OK" if ok else "FAIL"
            print("RESULT boss_%s: %s" % (slug, status), flush=True)
        manifest.append((slug, zh, status, out))
        # 落一份 prompt 存档供日志引用
        with open(os.path.join(OUT_DIR, "boss_%s.prompt.txt" % slug), "w", encoding="utf-8") as f:
            f.write(prompt)
    with open(os.path.join(OUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        import json
        json.dump([{"slug": s, "zh": z, "status": st, "file": p} for s, z, st, p in manifest],
                  f, ensure_ascii=False, indent=2)
    print("DONE manifest: %s" % os.path.join(OUT_DIR, "_manifest.json"), flush=True)


if __name__ == "__main__":
    run()