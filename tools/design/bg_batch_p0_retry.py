# -*- coding: utf-8 -*-
"""bg_batch_p0_retry.py — 重新生成 QC FAIL 的 5 张 bg（修正 prompt，≤2 次重试）。
覆盖 xingjichuanqi2_bg_mine 若 FAIL 亦可加。"""
import os, sys, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("gen_wan", os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_wan.py"))
gw = importlib.util.module_from_spec(spec); spec.loader.exec_module(gw)
gen = gw.gen
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_bg_batch_p0")
os.makedirs(OUT, exist_ok=True)

RETRY = [
    ("bs_bg_cinema",
     "空镜背景，纯室内电影院逃生楼梯间夜景，暗红色警报光在墙壁闪动，楼梯角落有火苗与烟雾升腾，金属楼梯扶手剪影，混凝土墙面斑驳被烟熏黑，画面整体昏暗压抑，绝对不要出现任何安全出口牌、任何标识、任何文字、任何符号图案、任何小人图案，画面空无一人，无生物，无噪点，电影感惊悚氛围"),
    ("bs_bg_highway",
     "空镜背景，深夜高速公路，天空是极深的墨黑色，浓重乌云遮蔽月色，两侧路灯投下昏黄而稀薄的光，湿漉沥青路面在路灯光与微弱车灯余晖下细细反光，远处高架桥剪影融入黑暗，画面阴暗、寂静、压抑，强调是黑夜而非白天，无任何人物，无车辆主体占满画面，无文字，无标识，无噪点，电影感"),
    ("bs_bg_mall",
     "空镜背景，空旷商厦室内中庭，玻璃穹顶透入天光，冷青色调，扶梯静置无人，一侧停用生锈货梯铁门半掩，大理石地面空旷整洁，绝对不要出现任何店招、任何文字、任何logo、任何店铺招牌、任何假人模特、任何人体模型，画面空无一人，无生物，无噪点，荒凉危险氛围"),
    ("jialebi_bg_deck",
     "空镜背景，十八世纪海盗船木制甲板，粗麻绳盘绕在木桩上，收起的旧帆布在桅杆下静垂，远海傍晚深蓝天际与一抹橙红夕光，甲板空无一人，绝对不要出现任何鸟类飞禽、不要海鸥、不要任何动物，无任何人物，无文字，无噪点，电影油画质感"),
    ("jishujing_bg_highschool",
     "空镜背景，荒废美国高中教室走廊，日光灯管冷白闪烁，两侧一排褪色绿色金属储物柜，地面干净整洁无任何纸张，尽头的门敞开透入冷光，走廊空荡无人，绝对不要出现任何文字、任何标牌、任何EXIT、任何图标、任何字迹，墙面和门楣保持完全干净无字，无任何人物，无生物，无噪点，梦魇压抑氛围"),
    ("xingjichuanqi2_bg_hospital",
     "空镜背景，老式医院走廊，苍白冷绿的荧光灯管忽明忽暗，斑驳脱落的墙皮，地面完全干净无任何纸张无任何杂物，尽头的防火门半掩，灰雾从门缝渗入，冷绿色调，画面空旷无人，绝对不要出现任何文字、任何标牌、任何EXIT、任何红色告示、任何字迹痕迹，墙面干干净净，无任何人物，无生物，无噪点，惊悚氛围"),
    ("shenghua3_bg_underground",
     "空镜背景，浣熊市地下污水管网，浑浊污水缓流反光，锈蚀钢管沿墙壁排列，唯一一盏暖黄色应急灯泡悬挂在管道上方投下昏黄光线，墙壁与管道为暗淡的混凝土灰和锈棕色，只有少量苔藓，整体色调以昏黄暖色和深褐为主，昏暗压抑，绝对不要出现大面积绿色，无任何人物，无生物，无文字，无噪点，生化危机压抑氛围"),
]

for name, prompt in RETRY:
    out_png = os.path.join(OUT, name + ".png")
    print("=== RETRY", name, flush=True)
    ok = gen(prompt, "768x1024", out_png, retries=3)
    print("DONE", name, "ok=", ok, flush=True)
print("=== RETRY SUMMARY ===", flush=True)
