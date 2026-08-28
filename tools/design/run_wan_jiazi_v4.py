# -*- coding: utf-8 -*-
"""run_wan_jiazi_v4.py — 伽椰子 BOSS 立绘 v4 生成(round4,专攻 v3 三残余缺陷)。
v3 已修复构图(composition 0.9,全身完整/脚手触底缘/纯黑达标)。本轮只强化三点:
1. 姿态:头颈反折 90° 从肩膀后回望(核心,exorcist head-turn / contortionist backward glance,
   面部面向镜头回望,NOT normal forward-facing crawl)。
2. 指缝:细黑发丝缠绕在过长指尖之间(thin hair strands, NOT rings/ropes/cords)。
3. 覆面:黑长直发盖住大半张脸,仅露惨白半张脸与黑眼窝(face mostly hidden)。
保留已达标:四肢着地爬行、全身完整手/脚触底缘、纯黑背景 + 惨绿描边 + 发尾羽化入黑;
严禁 "cropped"/"crop" 措辞。
输出 raw_zhouyuan/boss_jiazi_raw4.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A full-body Japanese female yurei (ghost) in the style of Kayako from Ju-on the grudge, "
    "the BOSS of a horror dungeon. Design intent exactly as specified. "
    "Pale near-white bloodless skin with dark hollow eye sockets, long straight jet-black hair "
    "hanging fully over her FACE, the hair mostly covering the entire face from the crown downward, "
    "only half of a pale white face and her dark hollow eye sockets barely visible through the "
    "fallen hair (face mostly hidden under the long black hair). "
    "Wearing a torn dirty white kimono (ragged, lower hem darkened black). "
    "CRAWLING forward on all four limbs, body low and hunched, chest close to the ground. "
    "THE HEAD IS REVERSED: the neck bent backward at an extreme 90-degree angle, "
    "the head turned fully backward to stare over her own shoulder directly at the viewer, "
    "an exorcist-style head-turn, a contortionist backward glance, her face looking back behind "
    "her while her body crawls forward — this is a backward-looking crawl, NOT a normal "
    "forward-facing pose, her chin facing the camera behind her own neck and shoulders. "
    "Fingertips excessively long, and between the long pale splayed fingers, THIN STRANDS of "
    "black hair are loosely coiled and weaving through the finger gaps — fine hair wisps sliding "
    "between the fingers, visibly single hair strands, NOT rings, NOT ropes, NOT cords, NOT "
    "bracelets, NOT thick knots. "
    "Body slightly translucent, strong silhouette, only a single highlight on the face. "
    "Whole body faintly rimmed in a sickly pale-green / haunting dark-green glow atmosphere. "
    "Framing and composition: ENTIRE body fully visible from the head to all four limb tips, "
    "fully contained inside the frame, nothing leaves the frame, nothing cut off; "
    "the subject occupies over 90% of the image height, centered and large; "
    "the feet and hands/palms reach to and touch the very bottom edge of the frame, "
    "the whole body fully inside the picture, all four limbs present and clearly separated. "
    "STYLE: horror illustration, full-body flat lone subject. "
    "Background: ABSOLUTELY flat pure black, uniform matte jet black, completely dark, "
    "NO floor, NO ground plane, NO ground shadow, NO floor reflection, NO light gradient, "
    "NO haze, NO glow behind the body, nothing behind or below the ghost at all, "
    "just the isolated figure against pure black (natural feathering of the hair tips into "
    "the black void is allowed as part of the design). "
    "NO white outline, NO rim light, NO halo on the figure. "
    "fully in frame, completely visible. "
    "四肢着地向前爬行身体前倾下伏, 头颈反折90度从肩膀后回望, 面部面向镜头回望是逆转头瞻式爬行绝不是正常朝前姿态, "
    "长直黑发从头顶大量盖住大半张脸仅露惨白半张脸与黑眼窝, 白衣和服褴褛下摆发黑, "
    "指尖过长指缝有细黑发丝缠绕不是环不是绳不是手镯, 躯体略半透明剪影感强, "
    "全身氛围惨绿描边, 立绘四周留黑发延伸羽化, "
    "全身完整居中占画面高度90%+, 手与脚接触画面最底缘且全身完全在画面内, "
    "背景绝对纯黑无地面无投影无渐变, 无白色描边无背光光晕, 身体完全可见不被裁切"
)


def main():
    OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "raw_zhouyuan", "boss_jiazi_raw4.png")
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()