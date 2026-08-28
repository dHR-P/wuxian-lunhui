# -*- coding: utf-8 -*-
"""run_wan_jiazi_v3.py — 伽椰子 BOSS 立绘 v3 生成(按 round3 正确口径 + 正式设定姿态)。
要点:
- 姿态:四肢着地爬行 + 头颈反折 90° 从肩膀后回望(正式设定,勿写正面立姿)。
- 指尖过长、指缝黑发缠绕(非绳索)。
- 构图:全身完整从头到脚、主体占画面高度 90%+、末端肢体接触画面最底缘;
  严禁出现 "cropped"/"crop" 措辞(易诱发裁切),表述为 "feet touching the very bottom edge of the frame, entire body fully visible, nothing leaves the frame".
- 背景:absolutely flat pure black, NO floor/ground/reflection/shadow/gradient/glow;
  发尾可自然羽化入纯黑(设计意图),但不得有地面。
- NO white outline, NO rim light, NO halo。
输出 raw_zhouyuan/boss_jiazi_raw3.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A full-body Japanese female yurei (ghost) in the style of Kayako from Ju-on the grudge, "
    "the BOSS of a horror dungeon. Design intent exactly as specified: "
    "Pale near-white bloodless skin with dark hollow eye sockets, long straight black hair "
    "hanging down completely covering her face, only half of a pale face and dark hollow "
    "eyes visible through the hair. Wearing a torn dirty white kimono (ragged, lower hem "
    "darkened black). CRAWLING on all four limbs, spider-like spread pose, spine bent "
    "unnaturally, HEAD NECK REVERSED 90 DEGREES looking back at the viewer over her own "
    "shoulder (head turned fully around). Fingertips excessively long, and wisps of black "
    "hair wrapped/tangled between the splayed fingers (hair strands in the finger gaps, "
    "NOT rope, NOT string). Body slightly translucent, strong silhouette, only a single "
    "highlight on the face. Whole body faintly rimmed in a sickly pale-green/haunting green glow atmosphere. "
    "Framing and composition: ENTIRE body fully visible from head to all four limb tips, "
    "fully contained inside the frame, nothing leaves the frame, nothing cut off; "
    "the subject occupies over 90% of the image height, centered and large; "
    "the feet and hands/palms reach to and touch the very bottom edge of the frame, "
    "the whole body fully inside the picture, all limbs present and clearly separated. "
    "STYLE: horror illustration, full-body flat lone subject. "
    "Background: ABSOLUTELY flat pure black, uniform matte jet black, completely dark, "
    "NO floor, NO ground plane, NO ground shadow, NO floor reflection, NO light gradient, "
    "NO haze, NO glow behind the body, nothing behind or below the ghost at all, "
    "just the isolated figure against pure black (natural feathering of the hair tips into "
    "the black void is allowed as part of the design). "
    "NO white outline, NO rim light, NO halo on the figure. "
    "no crop, no cropped, no truncation, fully in frame. "
    "黑长直发覆面露惨白半张脸与黑眼窝, 白衣和服褴褛下摆发黑, 四肢着地爬行, "
    "头颈反折90度从肩膀后回望, 指尖过长指缝黑发缠绕(不是绳索), 躯体略半透明剪影感强, "
    "全身氛围惨绿描边, 立绘四周留黑发延伸羽化, "
    "全身完整居中占画面高度90%+, 手与脚接触画面最底缘且全身完全在画面内, "
    "背景绝对纯黑无地面无投影无渐变, 无白色描边无背光光晕, 绝不被画面裁切"
)


def main():
    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "raw_zhouyuan", "boss_jiazi_raw3.png")
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()