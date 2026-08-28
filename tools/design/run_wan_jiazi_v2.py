# -*- coding: utf-8 -*-
"""run_wan_jiazi_v2.py — 伽椰子 BOSS 立绘 v2 生成(修正版)。
qwen3.7-flash 对 boss_jiazi_raw QA 判不合格,缺陷:
 ① 背景非均匀纯黑:人物下方有落地投影/地面质感(约下方1/5为黑色空带/地面);
 ② 构图:脚底未贴近底缘,上方/下方留黑过多,主体未充满画面高度;
 ③ 细节:手部缠绕的黑绳结构混乱,手指融合畸变。
修正:强化绝对平面纯黑背景、无地面/无投影/无环境光遮蔽;主体放大占画面高度90%+、
      脚掌贴底被轻微裁切;双手指节清晰分开。保持伽椰子设定(苍白长发、白色和服、女怨灵、日式恐怖)。
输出 raw_zhouyuan/boss_jiazi_raw2.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A ghostly Japanese female yurei in the style of Kayako from Ju-on, the grudge spirit: "
    "pale near-white bloodless skin, long straight black hair hanging down over her face "
    "(face mostly hidden), wearing a soiled white kimono with a black sash, in a crawling "
    "horror pose with one hand on the floor and body hunched forward, spine bent unnaturally. "
    "Horror, ominous, curse, night. "
    "Her whole body and the white kimono and pale skin are brightly lit by a cool white key "
    "light from the front, clearly brighter than the background; hair edges crisp. Both hands "
    "fully visible with clear separate fingers, NO merged or blurry fingers, NO ambiguous "
    "black strings/tangles around the fingers. "
    "LARGE full body taking up over 90% of the image height, feet/palms planted toward the "
    "very bottom edge of the frame, cropped slightly by the bottom frame edge, centered. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor, NO ground plane, NO ground shadow, NO floor reflection, NO light gradient, "
    "NO glow, NO haze, no visible ground at all, nothing behind or below the spirit. "
    "Just the fully-isolated character against pure black, no contact shadow under the body. "
    "Horror illustrations, full-body flat spare against black. "
    "全身怨灵居中放大, 贴底, 背景绝对纯黑无地面无投影, 手指清晰分开"
)


def main():
    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "raw_zhouyuan", "boss_jiazi_raw2.png")
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()