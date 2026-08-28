# -*- coding: utf-8 -*-
"""run_r5.py — 咒怨 BOSS 伽椰子 r5 多变体生成器(放手重试,预算不限)。
用法: python run_r5.py <变体名> [seed?]
输出: tools/design/raw_zhouyuan/boss_jiazi_r5<name>.png
模型 wan2.7-image via tokenrhythm(纯 prompt,该端点不支持 image 参考输入,已探测确认)。
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_zhouyuan")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------- 通用基础段(已达标项,v4 继承) -----------------
# 纯黑背景+惨绿描边+发尾羽化+贴底缘+全身完整+黑发覆面+指缝细发丝(非环绳)
BASE = (
    "A full-body Japanese female yurei (ghost) in the style of Kayako from Ju-on the grudge, "
    "the BOSS of a horror dungeon. "
    "Pale near-white bloodless skin with dark hollow eye sockets, long straight jet-black hair "
    "hanging fully over her FACE, the hair covering nearly the entire face from the crown downward, "
    "only half of a pale white face and her dark hollow eye sockets barely visible through the "
    "fallen hair. "
    "Wearing a torn dirty white kimono (ragged, lower hem darkened black). "
    "Fingertips excessively long, pale; thin individual strands of black hair threading loosely "
    "BETWEEN the splayed fingers like a spiderweb, fine wisps, NOT a ring, NOT a rope, NOT a cord. "
    "Body slightly translucent, strong silhouette, only a single dim highlight on the face. "
    "Whole body faintly rimmed in a sickly pale-green / haunting dark-green glow atmosphere. "
    "Framing and composition: ENTIRE body fully visible, fully contained, nothing leaves the frame; "
    "the subject occupies over 90% of the image height, centered and large; "
    "the feet and hands reach to and touch the very bottom edge of the frame; the whole body fully "
    "inside the picture. "
    "STYLE: horror illustration, full-body flat lone subject. "
    "Background: ABSOLUTELY flat pure black, uniform matte jet black, completely dark, "
    "NO floor, NO ground plane, NO ground shadow, NO floor reflection, NO light gradient, "
    "NO haze, NO glow behind the body, nothing behind or below the ghost at all, "
    "just the isolated figure against pure black (natural feathering of the hair tips into "
    "the black void is allowed as part of the design). "
    "NO white outline, NO rim light, NO halo on the figure. fully in frame, completely visible. "
    "长直黑发从头顶盖住大半张脸仅露惨白半张脸与黑眼窝, 白衣和服褴褛下摆发黑, "
    "指缝是细黑发丝像蛛网般缠绕不是环不是绳不是手镯, 躯体略半透明剪影感强, "
    "全身氛围惨绿描边, 立绘四周留黑发延伸羽化, "
    "全身完整居中占画面高度90%+, 手与脚接触画面最底缘且全身完全在画面内, "
    "背景绝对纯黑无地面无投影无渐变, 无白色描边无背光光晕, 身体完全可见不被裁切"
)

# ---------------- 变体 PROMPTS -----------------
PROMPTS = {

    # r5a: 反向回望攻坚(核心-长曝多次+分解措辞)。四肢着地爬行,身体朝前,头颈反向折回面向镜头。
    "r5a": (
        # 肢体分解:爬行方向指向画面深处(脚朝镜头),头从肩后探出面向镜头。
        "CRAWLING backward toward the viewer: she faces AWAY from the camera (her buttocks and "
        "the soles of her feet point at the viewer) but twists her head 180 degrees back over her "
        "own shoulder so her pale face and dark hollow eyes look DIRECTLY at the camera, "
        "chin and nose pointing at the viewer, an exorcist backward neck turn, contortionist. "
        "HER HEAD COMES BACK FROM BELOW/UNDER HER OWN SHOULDER to face the viewer while the body "
        "crawls forward away from us — the neck is folded, the head reaches back over the back. "
        "四肢着地背着镜头向画面深处爬去, 头颈从自己肩后反折180度转回面向镜头, "
        "脸与黑眼窝正对镜头像驱魔人反转头, 绝对不是正常朝前低头姿势"
        + BASE
    ),

    # r5b: 经典爬楼降标姿态(影片经典「从楼梯爬下面对镜头」),头自然抬起面向镜头(非反折)。
    "r5b": (
        "CRAWLING down toward the viewer, body coming straight at the camera low on all fours, "
        "chest close to the ground, the head RAISED up high facing the viewer so the pale half-face "
        "and dark hollow eyes look directly into the camera (an upturned crawling gaze, the "
        "classic Ju-on Kayako stairs descent pose). "
        "四肢着地向前爬向镜头, 头抬高面向镜头, 惨白半脸与黑眼窝正对镜头(咒怨经典爬下楼面对镜头姿态)"
        + BASE
    ),

    # r5c: 纯反折攻坚-极度强调(单张)
    "r5c": (
        "A horror contortionist pose: the body crawls forward on all four limbs away from the "
        "viewer, but the NECK AND HEAD ARE COMPLETELY REVERSED, the head folded backward and "
        "reappearing OVER the shoulder facing the viewer, like an owl head fully rotated, "
        "the face clearly looking back at the camera. A backward-looking crawler, extreme spine twist. "
        "身体向前爬, 脖子与头整体向后反折, 头从肩膀上方/后方折回重新对准镜头, 像猫头鹰把头完全扭转, 脸回看镜头"
        + BASE
    ),

    # r5d: 侧身爬+头转向侧后回望(跨度稍小,或更易成)
    "r5d": (
        "Crawling on all four limbs in SIDE PROFILE, body moving to the side, the head turned "
        "fully around backward over her shoulder so the pale face and dark hollow eyes look back "
        "at the viewer from behind her own neck (head turned back to face camera while crawling). "
        "侧身四肢着地爬行, 头从肩后完全转回面向镜头回望(一边爬一边转头回看镜头)"
        + BASE
    ),

    # r5e: 降标主推 — 四肢着地爬行 + 黑发坚决覆面包头 + 无多余物(核心攻坚「覆面」,反折已降标放弃)
    "r5e": (
        "Crawling forward toward the viewer low on all four limbs, back arched like a cat. "
        "THE HAIR IS THE FOCUS: long straight jet-black hair hangs DOWN from her crown and drapes "
        "completely OVER AND WRAPS AROUND the entire head like a heavy shroud, fully covering the "
        "face from the crown, brow, eyes to the chin; only a sliver of pale ashen skin and one or "
        "two dark hollow eye sockets peek through the parted black strands. The head is bowed "
        "slightly forward. NO body part other than the yurei herself. "
        "头裹在长直黑发里像垂发面纱, 黑发从头顶完全罩住整个头部只露一道惨白皮肤缝与黑眼窝, 四爪着地向前爬, "
        "绝对没有其他动物或异物, 只有她一个人物"
        + BASE
    ),

    # r5f: 反折最后攻坚 — 骨头/解剖措辞 + 面朝后, 尝试画翻转头
    "r5f": (
        "An anatomical horror study: the skeleton crawls FORWARD on all fours, but the cervical "
        "spine is twisted a full 180 degrees so the skull/face points BACKWARD at the viewer "
        "(like a crouching person whose head is rotated completely around on their neck to look "
        "behind them). The pale weeping face, dark hollow eyes and open mouth stare directly at "
        "the camera from over the person's own back. Clearly two opposite directions: body toward "
        "the front, face toward the viewer. "
        "骨架向前爬, 颈椎扭转180度让骷髅脸完全朝后面向镜头(就像蹲着的人把整个头在脖子上转到背后看身后的人), "
        "惨白脸黑眼窝张嘴从本人背后正对镜头, 身体朝前头朝后两方向相反"
        + BASE
    ),

    # r5g: 降标主推 v2 — 明确四肢着地爬行(非跪坐) + 黑发深覆面 + 干净指缝(继承 r5e 覆面思路但强制爬行非跪)
    "r5g": (
        "A low quadrupedal crawl, NOT kneeling: the ghost is on flat palms and toes/knees, body "
        "parallel to the ground, chest and belly low and near the floor, spine arched like a cat. "
        "Hands flat on the ground far in front, knees bent under, feet behind. Her long jet-black "
        "hair hangs down from the crown and falls forward shrouding her inverted head almost "
        "entirely: fine black strands cover the brow, both eye sockets and hang over the cheeks "
        "and chin, with only a thin pale strip of nose and one dark hollow eye socket peeking "
        "between the strands — a veiled, mostly hidden face. Four clear separate limbs all "
        "touching the ground. NO other creature, NO animal. "
        "是趴地四肢爬行绝对不是跪坐: 平趴在地像猫一样拱背, 肚腹贴近地面, 双手平摊在前、膝盖弯在身下、脚在后, "
        "四只肢体都着地清晰分开, 长直黑发从头顶垂下向前罩住下探的头部几乎全遮, 只有一道惨白鼻梁与一个黑眼窝从发丝间露出, "
        "头埋在黑发里, 绝对没有其他动物或异物"
        + BASE
    ),
}

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "r5a"
    if name not in PROMPTS:
        print("unknown variant: %s" % name, flush=True)
        print("available: %s" % ",".join(PROMPTS.keys()), flush=True)
        sys.exit(1)
    out = os.path.join(OUT_DIR, "boss_jiazi_%s.png" % name)
    ok = gen(PROMPTS[name], "768x1024", out)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", out), flush=True)
    sys.exit(0 if ok else 1)