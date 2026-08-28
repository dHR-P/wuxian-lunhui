# -*- coding: utf-8 -*-
"""run_wan_hunter2.py — hunter(猎杀者)立绘 v2 生成。
qc_wan_hunter1 判定需重生成:下半身黑剪影已修复,但 ①白色外描边残留(rim light 烤出白边)
②姿态为直立站姿(正式设定要更强攻击性)③缺深色战术紧身衣(误判项:wan_prompts 正式设定=无皮肤
肌肉怪兽、无衣物;保持 skinless 设定,不穿衣物)。
修正:①rim light 收敛为"细冷色线、绝不烤出纯白描边";②姿态=低重心蓄力扑击猎杀姿态;
③保留下半身明亮肌肉块面 + 脚掌贴底缘被轻裁切。
输出 raw_enemy/hunter_wan2.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A skinless muscular monster, pale gray-brown muscle skin with clear visible muscle "
    "blocks, broad shoulders thick chest, solid dense torso, thick muscular arms and legs, "
    "white bone spikes on forearms, huge claw on left hand, sharp blade on right hand, "
    "in a fierce dynamic low-center lunging hunting pose, knees bent, ready to pounce. "
    "No clothing no fabric. "
    "Entire body including the lower abdomen, hips, thighs, calves and feet is brightly "
    "lit with muscular highlights; the lower body must be as bright and detailed as the "
    "upper body, absolutely no dark silhouette on the legs or feet. "
    "Feet on the bottom edge of the frame, soles cropped slightly by the bottom frame edge. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze, "
    "no visible ground plane at all, nothing behind the character. "
    "A thin cool rim light outlines the silhouette as a clean thin line only; "
    "absolutely NO pure white outline, NO white edge, NO white glow around the body. "
    "High detail, sharp, single character. "
    "全身猎杀姿态居中, 下半身明亮, 脚掌贴紧画面底缘被轻微裁切, 背景纯黑无白描边"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "hunter_wan2.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)