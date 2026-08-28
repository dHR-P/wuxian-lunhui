# -*- coding: utf-8 -*-
"""bg_batch_p0_gen.py — 批量生成 P0 通用背景池（12 张 768x1024 空镜）。
规则：纯空镜/无人形/无文字水印。生成到 raw_bg_batch_p0/ 。
用法: D:\\AI_Tools\\ComfyUI\\python_embeded\\python.exe bg_batch_p0_gen.py
"""
import os, sys, importlib.util, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("gen_wan", os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_wan.py"))
gw = importlib.util.module_from_spec(spec); spec.loader.exec_module(gw)
gen = gw.gen

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_bg_batch_p0")
os.makedirs(OUT, exist_ok=True)

# (filename 基名, prompt)
BATCH = [
    ("bs_bg_airport", "空镜背景，现代机场候机厅全景，空旷无人，灾难前的宁静氛围，冷白色荧光灯光从高窗洒下，落地玻璃幕墙，远处停机坪晨光，一排排空座椅与登机口，无任何人物，无文字，无标识，无噪点，画面干净写实电影感"),
    ("bs_bg_highway", "空镜背景，夜间高速公路，大雨滂沱后的湿滑路面反光，两排昏黄车灯拖出光轨，车祸发生前的寂静，远处桥梁轮廓，天空灰暗乌云翻滚，无任何人物，无车辆主体占满画面，无文字，无噪点，电影感氛围"),
    ("bs_bg_mall", "空镜背景，大型商场室内中庭，玻璃穹顶透下天光，人群已散的空旷大厅，扶梯静置，一侧停用生锈货梯铁门半掩，冷调色，略显荒凉危险，无任何人物，无文字，无噪点，电影感"),
    ("bs_bg_cinema", "空镜背景，电影院建筑内部逃生楼梯间，火光在墙壁上跳跃，红色警报灯闪烁，浓烟弥漫楼梯转角，金属防烟门发红，逃生指示灯光忽明忽暗，无人影，无文字，无噪点，惊悚气氛"),
    ("xingjichuanqi2_bg_mine", "空镜背景，废弃煤矿矿洞内部，浓重灰雾弥漫，锈蚀矿车轨道延伸向黑暗，木支撑梁泛着潮湿雾气，唯一一盏昏黄矿灯，湿漉地面反光，无人影，无文字，无噪点，压抑寂静氛围"),
    ("xingjichuanqi2_bg_hospital", "空镜背景，老式医院走廊，苍白日光灯忽明忽暗，斑驳墙皮，尽头的防火门半开，地上散落病历纸，走廊空荡无人，灰雾从门缝渗入，冷绿色调，无人影，无文字，无噪点，惊悚氛围"),
    ("jialebi_bg_deck", "空镜背景，十八世纪海盗船木质甲板，粗缆绳盘绕，帆布在风中鼓起，远海日落橙红色天际线，甲板空旷无人，海鸥飞过，锈蚀铁炮静置，无任何人物，无文字，无噪点，油画电影感"),
    ("jialebi_bg_cove", "空镜背景，加勒比沉船湾，一艘半沉海盗船残骸搁浅在礁石湾，船身倾斜长满藤壶，清澈海水没过船舷，白色沙滩与礁石，迷雾沉沉，无人影，无文字，无噪点，电影感"),
    ("shenghua3_bg_underground", "空镜背景，浣熊市地下污水管网，浑浊污水缓流，锈蚀钢管沿墙壁排列，绿荧光苔藓，尽头铁栅门，昏暗只余管道上方一盏应急灯，无人影，无文字，无噪点，生化危机压抑氛围"),
    ("shenghua3_bg_lab", "空镜背景，生物实验室孵化舱室，玻璃培养舱壁透出幽绿生物荧光，托盘试管架，管道密布，冷白光，中央一个空置的培养罐投下阴影，无人影，无文字，无噪点，科幻恐怖氛围"),
    ("jishujing_bg_boiler", "空镜背景，梦境锅炉房，巨大铸铁锅炉炉体，炉门缝渗出橙红火光，地面蒸汽弥漫，锈迹管道如血管般盘绕，砸碎的压力表玻璃，无人影，无文字，无噪点，噩梦氛围"),
    ("jishujing_bg_highschool", "空镜背景，废弃美国高中教室走廊，日光灯闪烁，墙上褪色储物柜，地面散落课本纸屑，尽头的教室门敞开透入冷光，走廊空荡无人，梦魇压迫感，无文字，无噪点，惊悚氛围"),
]

os.makedirs(os.path.join(OUT, "qc"), exist_ok=True)
results = {}
for name, prompt in BATCH:
    out_png = os.path.join(OUT, name + ".png")
    if os.path.exists(out_png) and os.path.getsize(out_png) > 20000:
        print("SKIP exists", name, flush=True)
        results[name] = "exists"
        continue
    ok = gen(prompt, "768x1024", out_png)
    print("DONE", name, "ok=", ok, flush=True)
    results[name] = "ok" if ok else "fail"

print("=== SUMMARY ===", flush=True)
for k, v in results.items():
    print(k, v, flush=True)
