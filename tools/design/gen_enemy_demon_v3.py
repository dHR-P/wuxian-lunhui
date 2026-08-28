# -*- coding: utf-8 -*-
"""gen_enemy_demon_v3.py — 恶魔 v3（软化措辞绕过内容审核，保留设定）。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy10\enemy_demon_v3.png"

BG_V2 = (
    "Background: absolutely flat solid pure black (#000000) filling ALL of the frame and every "
    "corner, completely empty, no floor, no ground plane, no ground shadow, no reflected light, "
    "no gradient, no fog, no mist, no particles, no vignette. Figure occupies the full height: "
    "head near top edge, feet pressed down to and cropped by the very bottom frame edge, full "
    "body visible. Absolutely NO glow, NO halo, NO rim light, NO outline, NO white edge, NO "
    "luminous bleed — every detail stays inside the silhouette, flat matte dark, never "
    "self-illuminating. Clean hard cut edge. 背景绝对整幅纯黑, 脚掌压住裁切进最底缘, 全身完整, 哑光暗色, 无任何外发光/描边/光晕, 边缘干净"
)

PROMPT = (
    "a tall imposing fantasy horned figure standing, heroic matte sculpted appearance, short "
    "dark horns, both dark wings fully folded against its back, long tail, muted ash-maroon "
    "matte hide with faint darker patterning (no shine, no glow), calm closed mouth, eyes looking "
    "forward matte dark, hands resting at sides, dramatic dark fantasy studio concept art, "
    "fantasy creature character sheet, standing full body, menacing-but-tasteful stance. "
    "一个高大的奇幻长角人物直立全身设定图, 哑光雕塑质感, 粗短深色犄角, 双翼完全收拢贴背, 长尾, 哑光灰褐皮缀暗色纹, 无光泽无发光, 神情沉稳闭口, 双手垂放, 奇幻怪物概念立绘, 暗调威慑姿态"
)

if __name__ == "__main__":
    ok = gen(PROMPT + BG_V2, "768x1024", OUT)
    print("RESULT demon_v3:", "OK" if ok else "FAIL", flush=True)
    sys.exit(0 if ok else 1)
