# -*- coding: utf-8 -*-
"""gen_enemy8.py — 一次性调用 gen_wan.gen 生成单张普通敌人立绘 raw。
用法: <comfy-python> gen_enemy8.py <slug>
内部维护 slug→prompt 映射，写 `768x1024`。
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy_8"

# 重生成强约束后缀：主体放大填满画面、最低点贴到帧底、rim light 严格内敛不外溢
_SUFFIX = (
    "主体占画面高度约 90-95%，整体放大填满取景；身体/衣摆/触须的最低点在画面最底部框缘处，"
    "紧贴并轻微贴破底缘裁切。纯黑背景必须绝对平面纯黑，画面内除主体外什么都没有，"
    "无任何地面、投影、反光、光晕、雾气、渐变或第二物体。"
    "冷灰蓝 rim light 只作为主体轮廓内侧的一圈极细收光，严禁白色描边、严禁外溢光晕、"
    "严禁光晕扩散出主体轮廓，边缘与黑底硬边分明，主体内部不透出自发光。"
    "主体边缘是干净锐利的分界面，四周干净无杂散白点。"
)

# 已验证获奖配方（pc/hunter v3：薄冷蓝 rim 细线收光 + 明确禁白描边禁白晕 + 贴底裁切 + 放大>90%）
_EN = (
    "LARGE full body taking up over 90% of the image height, standing centered, "
    "the lowest point (feet / hem / tentacles) touching the very bottom frame edge and "
    "cropped slightly by the bottom frame edge. "
    "Background: flat pure black, absolutely uniform matte black, NO floor reflection, "
    "NO ground shadow, NO light gradient, NO glow, NO haze, no ground plane at all, "
    "nothing behind the subject. "
    "A thin cool gray-blue rim light outlines the silhouette as a clean THIN line only; "
    "absolutely NO pure white outline, NO white edge stroke, NO white glow bleeding into "
    "the background, the silhouette terminates cleanly and flat against the black. "
    "High detail, sharp, single character."
)

PROMPTS = {
    "ghoul": u"A rotting ghoul monster, extremely pale gray-green decaying humanoid, "
        "gray-white mottled rotting flesh with visible veins, hunched bent back, "
        "very long arms ending in long black claws, scrawny trailing lower body, "
        "ragged hair, snarling bared teeth, asymmetric twisted standing pose. " + _EN,
    "cultist": u"An occult cultist, dark reddish-brown hooded robe, hood covering face, "
        "pale bone mask on face, holding a curved blade dagger, other hand forming a spell "
        "gesture, long robe hem trailing on the ground, fine fabric folds, standing. " + _EN,
    "robot": u"A mechanical war machine humanoid, exposed metal skeleton, dark armor plates, "
        "glowing red core light in the chest, helmet-like head with glaring red energy eyes, "
        "exposed joint pipes, stiff robotic stance with steel claw hands. " + _EN,
    "insect": u"An insectoid monster, dark chitin armored upright insect, segmented many legs "
        "(at least six), a pair of curved antennae on top, compound eyes with faint glow, "
        "front limbs are scythe-like mantis arms, chitin with segmented reflections. " + _EN,
    "wraith": u"A wraith specter, semi-transparent ghostly anguished spirit form, lower body "
        "dissolving into trailing wispy mist that reaches down toward the bottom of the frame, "
        "long thin spectral claws, blurred anguished face with dim green glowing eyes, "
        "floating ominous pose, occupying over 90% of the frame height. " + _EN,
    "brute": u"A huge brutish monster, massive thick pale green-gray body, bone plate armor on "
        "shoulders and back, pillar-like arms, huge bone-hammer fists, protruding tusks, "
        "bone belt ornaments, slightly hunched menacing towering stance. " + _EN,
    "mummy": u"A dried mummy, fully wrapped in aged yellowed bandages, locally unraveled "
        "revealing cracked dark dried skin, arms crossed over the chest, face wrapped with only "
        "hollow eye sockets and mouth visible, Egyptian priest shawl headdress, hunching stance. " + _EN,
    "sea_creature": u"A translucent deep-sea aberration, semi-transparent blue humanoid sea "
        "creature covered in glowing bioluminescent spots, fan-like fin membranes spread on "
        "both sides of the head, tentacles extending from shoulders and lower body, webbed "
        "claws, fin-webbed feet, floating pose, occupying over 90% of the frame height and "
        "lowest tentacle tips near the bottom edge. " + _EN,
}

def main():
    slug = sys.argv[1]
    prompt = PROMPTS[slug]
    out = os.path.join(RAW, "%s.png" % slug)
    os.makedirs(RAW, exist_ok=True)
    ok = gen(prompt, "768x1024", out)
    print("ENEMY8 %s -> %s : %s" % (slug, out, "OK" if ok else "FAIL"), flush=True)
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
