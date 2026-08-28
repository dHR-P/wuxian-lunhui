# -*- coding: utf-8 -*-
"""run_wan_hunter3.py — hunter(猎杀者)立绘 v3 生成。

基于 run_wan_hunter2.py 改造。hunter2 仍残留白色外描边风险(rim light 可能烤出白边)。
v3 修正:
  ① 负面强化:NO white outline/rim light/blue-edge glow;肌肉轮廓必须干净平坦地终止
     在纯黑背景上;**移除**原 "A thin cool rim light outlines..." 那句,防白描边复发。
  ② 背景:flat pure black,no reflected light on ground,no floor shadow,no ground plane
     at all,bg_dark 保持高。
  ③ 保留下半身(腹/腿/脚)与上半身同亮、绝无黑剪影;爪/刀清晰分离。
  ④ 保持低重心扑击姿态 + 脚掌贴底缘被轻裁切。

中文对象 = 无皮肤肌肉怪兽(灰棕肌肉块面、无衣物、左巨爪右刀骨刃、低重心扑击猎杀姿态,非人类)。
输出 raw_enemy/hunter_wan3.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A skinless muscular monster, pale gray-brown muscle skin with clear visible muscle "
    "blocks, broad shoulders thick chest, solid dense torso, thick muscular arms and legs, "
    "white bone spikes on forearms, huge claw on left hand, sharp blade bone on right hand, "
    "in a fierce dynamic low-center lunging hunting pose, knees bent, ready to pounce. "
    "No clothing no fabric. "
    "Entire body including the lower abdomen, hips, thighs, calves and feet is brightly "
    "lit with muscular highlights; the lower body must be as bright and detailed as the "
    "upper body, absolutely no dark silhouette on the legs or feet. "
    "The huge left claw and the right blade bone are both clearly separated from the body, "
    "sharp and defined. "
    "Feet on the bottom edge of the frame, soles cropped slightly by the bottom frame edge. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO reflected light on ground, NO floor shadow, NO light gradient, NO glow, NO haze, "
    "NO ground plane at all, nothing behind the character. "
    "NO white outline, NO rim light, NO blue-ish edge glow; the muscular body silhouette "
    "must terminate cleanly and flat against the pure black background. "
    "High detail, sharp, single character. "
    "全身猎杀姿态居中, 下半身明亮, 脚掌贴紧底缘被轻裁切, 背景纯黑无白描边无轮廓光无地面反光"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "hunter_wan3.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)