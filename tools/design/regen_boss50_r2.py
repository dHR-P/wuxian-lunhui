# -*- coding: utf-8 -*-
"""regen_boss50_r2.py — 对 raw QC 判 FAIL 的 BOSS 按修正后缀 REV2 重新生成 r2 立绘。
重点: 彻底去白描边/背光晕, 主体题材强化(尤其 miwujuwu 触须克苏鲁)。
输出: tools/design/raw_boss50/boss_<slug>_r2.png  (768x1024)
用法:  python regen_boss50_r2.py [slug1 ...]   (不给参数=重建全部已存在 raw 且标记为待重新生成的)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_boss50")
os.makedirs(OUT_DIR, exist_ok=True)

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

# 待重新生成的 slug → 强化后的主题 prompt(不含 REV2)
R2 = {
    "sanjiaotou": (
        "A Silent-Hill-style iron triangular-head boss: a huge rusted-metal triangular helmet "
        "fully covering the face (face hidden), a colossal triangular great-blade held at the "
        "side, a long tattered grey burial shroud cloak over the muscular body, dark ash-grey "
        "skin, faint dark-red accents on the blade edge, upright statuesque menacing stance, "
        "cold grim atmosphere."
    ),
    "fulaidi": (
        "A Nightmare-on-Elm-Street burn-scarred dream-demon: a humanoid with a severely burned "
        "criss-cross scarred face under a dark fedora, razor-claw glove with four long blade "
        "claws on one hand, dirty red-and-green horizontal-stripe pullover sweater, hunched "
        "grinning menace."
    ),
    "baojun": (
        "A Resident-Evil T-virus type-t tyrant giant: a huge grey-skinned towering brute with "
        "exposed overgrown muscle fibers, small underdeveloped head, oversized clawed fists "
        "clenched, an exposed beating heart at the chest, tattered dark pants, raw savage "
        "menace, standing full height."
    ),
    "miwujuwu": (
        "A colossal Cthulhu-esque fog-veiled eldritch entity: a gigantic shadowy silhouette "
        "with several HUGE thick writhing tentacles and an indistinct mountainous form, "
        "deep unfathomable cosmic horror, invisible monstrous presence. The body and tentacles "
        "are SOLID and well-defined against the flat pure black background, NO fog, NO smoke, "
        "NO mist inside the frame, only crisp dark creature and thin cool-white key light from "
        "front. formless inscrutable dread (把雾气全部从画面移除, 主体实体化清晰)."
    ),
    "xingshiwang": (
        "A dead-mist-town zombie king: an emaciated shambling corpse-fiend, tattered ragged "
        "clothes, partial rotting flesh, wispy black fog tendrils coiling around the limbs but "
        "kept THIN and dark (NOT filling the frame with smoke), hollow burning eye sockets, an "
        "iron crown, dread undead menace, crisp dark silhouette."
    ),
    "juanzhe": (
        "A servant of an Old God from the sunken deep-sea temple: semi-translucent pale "
        "aquamarine eldritch being with writhing tentacles, webbed clawed limbs, deep-dark-blue "
        "corrupted holy vestments of barnacles and coral, micro glow contained on the body "
        "only (NO ambient glow into background), many unblinking eyes, deep-sea cosmic horror."
    ),
    "kuangxie": (
        "A battlefield cursed war-crazed legion commander: towering barbaric warrior in crude "
        "ancient bronze-and-iron battle armor crusted with dried blood and rust, large horned "
        "helmet, a great blade, fierce martial aura, blood-red war paint and ragged war "
        "banner, commanding undying battle-dread."
    ),
    "shourenchaowang": (
        "An orc tide-war king of the endless forest: colossal brutish orc giant in crude "
        "bone-plate armor lashed with sinew, thick tusks, glowing eyes, a massive bone war-club, "
        "scarred grey-green muscle, fierce suffocating ferocity, looming war-god menace."
    ),
    "jixieronghe": (
        "A skynet-style machine-flesh fusion entity: a biomechanical amalgam of cold dark-metal "
        "mechanical armor and wet organic muscle fused together, glowing red optical sensors, "
        "exposed cables and blood vessels intertwined, hydraulic pistons and sinew, cold "
        "industrial menace, looming war-machine humanoid."
    ),
    "poxujiezhe": (
        "A xianxia transcendent realm-breaker invader: over-body of faint semi-transparent "
        "radiant golden-white halo AND crisp dark xianxia robes woven with void-light patterns, "
        "jagged spatial cracks shimmering faintly at the edges but contained (no haze fill), "
        "flowing otherworldly power. The robe silhouette stays crisp against pure black."
    ),
}


def run():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else list(R2.keys())
    manifest = []
    for slug in slugs:
        if slug not in R2:
            print("no prompt for %s, skip" % slug, flush=True)
            continue
        out = os.path.join(OUT_DIR, "boss_%s_r2.png" % slug)
        print(">>> regenerating r2 boss_%s" % slug, flush=True)
        ok = gen(R2[slug] + REV2, "768x1024", out)
        print("RESULT r2 boss_%s: %s" % (slug, "OK" if ok else "FAIL"), flush=True)
        manifest.append((slug, "OK" if ok else "FAIL", out))
        with open(os.path.join(OUT_DIR, "boss_%s_r2.prompt.txt" % slug), "w", encoding="utf-8") as f:
            f.write(R2[slug] + REV2)
    with open(os.path.join(OUT_DIR, "_manifest_r2.json"), "w", encoding="utf-8") as f:
        import json
        json.dump([{"slug": s, "status": st, "file": p} for s, st, p in manifest],
                  f, ensure_ascii=False, indent=2)
    print("R2 DONE", flush=True)


if __name__ == "__main__":
    run()