# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design")
from gen_wan import gen

OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\yiy_queen_v4.png"
PROMPT = (
    "科幻惊悚电影《异形》中的异形皇后(Alien Queen)：巨大修长的纯黑色金属光泽黑甲外壳生物，锯齿背甲，"
    "长辫头冠，巨口中嵌套锋利内齿，口器滴落墨绿色酸液。全身完整站姿贴底。"
    "硬性要求：整体必须是极暗的黑色甲壳覆盖，通体以深黑为主色调，绝不允许在身体轮廓外出现任何白色、灰白或浅色描边/光晕/外发光/白雾。"
    "酸液与眼睛小范围绿色点缀仅限主体内部，不得溢出轮廓。背景为绝对纯净的纯黑色(#000000)，"
    "主体黑甲暗部与黑底融为一体，边界无任何亮边，无白色轮廓线。全身立绘，黑色调"
)
ok = gen(PROMPT, "768x1024", OUT)
print("V4_RESULT", ok, os.path.getsize(OUT) if os.path.exists(OUT) else 0)
