# -*- coding: utf-8 -*-
"""gen_npc10_r3.py — 背景渐变/泛光的 5 张 NPC 用「詹岚验证基线」严格平黑 prompt 重生成(v4)。
沿用 gen_pc_zhanlan.py 成功催生纯黑无渐变背景的措辞(中文+英文双保险):
  - 明确 #000000 均匀 matte 底 / NO vignette / NO gradient / NO floor / NO shadow / NO glow
  - "bottom edge stays uniform pure black" + 脚下虚空
  - 无白描边/无轮廓光/无光晕、剪影干净平贴背景
输出: raw_npc10/<slug>_v4.png
用法: <comfy-python> gen_npc10_r3.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_npc10")
os.makedirs(RAW, exist_ok=True)

# 詹岚基线证明的背景块 + 无白晕块(逐字复用成功措辞)
BG_BLOCK = (
    "Background: flat pure black absolute uniform matte #000000, NO vignette, NO gradient, "
    "NO floor reflection, NO ground shadow, NO glow, NO haze, no ground plane; bottom edge "
    "stays uniform pure black. "
    "Absolutely NO white outline, NO rim light, NO halo; silhouette must terminate cleanly "
    "and flat against the background, absolutely no white border. "
)
FULLBODY_BLOCK = (
    "She is a normal healthy human. Her whole body including dark clothing and hair is "
    "brightly and evenly lit by a cool white key light from the front, clearly brighter than "
    "the pure black background; no part of the body is the same darkness as the background. "
    "FULL BODY: the whole figure from top of head to shoe soles takes up over 90% of image "
    "height; feet shoes touch the very bottom edge cropped slightly; standing centered with "
    "almost no margin below the feet. Both hands fully visible with clear separate fingers. "
    "High detail, sharp, single character, 768x1024 vertical game portrait. "
    "全身单人立绘居中, 人物占画面高度90%以上, 脚掌贴底缘轻裁切, 双手清晰; "
    "纯黑#000000背景无暗角无渐变无地面无反射, 脚下虚空; 无白描边无轮廓光无光晕, 剪影干净平贴背景"
)

CHAR_EN = {
    "npc_guard": ("A single full-body portrait of a serious professional security guard, an adult "
                  "Asian man with short black hair, stern calm face, wearing a dark-blue security "
                  "guard uniform with badge and shoulder patches and a black peaked cap, both hands "
                  "resting on a compact black pistol holstered at his waist, standing tall and centered. "),
    "npc_merchant": ("A single full-body portrait of a shrewd middle-aged merchant man, well-groomed "
                     "with neatly combed hair, wearing a neat dark vest over a white shirt with a "
                     "necktie and a gold pocket-watch chain, gently holding a small coin purse in one "
                     "hand, cunning calculating eyes, confident upright posture, standing centered. "),
    "npc_doctor": ("A single full-body portrait of a calm professional doctor, an adult male, wearing "
                   "a clean white doctor coat over light clothes with a stethoscope around his neck, "
                   "holding a clipboard, neutral professional expression, standing tall and centered. "),
    "npc_soldier": ("A single full-body portrait of a combat soldier, an adult man, wearing a dark-green "
                    "military field uniform with body armor vest and a helmet, both gloved hands holding "
                    "a rifle with the muzzle pointing up safely, alert stern face, standing tall and "
                    "centered. "),
    "npc_elder": ("A single full-body portrait of a frail elderly man with short white hair and a long "
                  "white beard and deep wrinkles, wearing a simple long dark robe, leaning on a wooden "
                  "walking staff in one hand, kind but weary face, standing tall and centered. "),
}

for slug in CHAR_EN:
    out = os.path.join(RAW, "%s_v4.png" % slug)
    prompt = CHAR_EN[slug] + FULLBODY_BLOCK + BG_BLOCK
    ok = gen(prompt, "768x1024", out)
    print("GENERATE %s_v4 -> %s" % (slug, "OK" if ok else "FAIL"), flush=True)
print("ALL_DONE", flush=True)
