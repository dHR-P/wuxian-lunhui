# -*- coding: utf-8 -*-
"""run_qc_all.py — 批量视觉质检 command/observatory/BOSS(raw+cut)。
把每个判定调用的 prompt 写好, 逐个调 qc_visual.qc。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qc_visual import qc  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))

# ---- 通用质检角色与模型声明(防猜对象) ----
ROLE = ("你是视觉质检员,使用模型 qwen3.7-flash。以下是《末世死城·人类防线》副本的正式美术设定,"
        "请严格依据设定判定图片是否验收合格,禁止臆测或放宽。"

# ---- command 场景 ----
COMMAND_SETTING = (
    "【正式设定】F3 地下指挥所(游戏场景背景图,768x1024):地下指挥中枢,深蓝荧光屏阵列、观测屏、电台设备,"
    "末世废墟风,指挥所深蓝荧光为主色调,冷蓝氛围光;场景不要求纯黑背景,允许末世破败感。"
)
COMMAND_CRITERIA = (
    "【判据】①对象符合设定:画面应呈现出指挥所的多块深蓝荧光屏/观测屏/电台等指挥设施,主题围绕地下指挥中枢;"
    "②构图完整:画面主体清晰、层次完整、无明显缺失或半边空洞;"
    "③无污染:无大块色斑/紫边/噪点/文字水印/无关杂物混入。"
)
COMMAND_TASK = ("请输出判定,格式: 判定=PASS/FAIL; 分数(object/comp/no_poll/color)=a/b/c/d(各0~1); "
                "主要缺陷=一句话。若明显不符合设定或对象错误(如出现怪物、现代城市等)判 FAIL。")

# ---- observatory 场景 ----
OBSERVATORY_SETTING = (
    "【正式设定】F4 炮台观测台(游戏场景背景图,768x1024):高空炮台观测台,巨型主炮残件/炮塔基座、观测甲板走道、"
    "信标塔等,高空夕照主调、开阔冷色天空,最终战场氛围,末世废墟风;场景不要求纯黑背景。"
)
OBSERVATORY_CRITERIA = (
    "【判据】①对象符合设定:画面应呈现出高空炮台/观测甲板/主炮等元素,夕照开阔冷调天际线;"
    "②构图完整:主体清晰、层次完整;③无污染:无大块色斑/紫边/噪点/文字水印/无关杂物。"
)
# 复用 COMMAND_TASK

# ---- BOSS raw ----
BOSS_SETTING = (
    "【正式设定】狂化攻城巨兽(Siege Beast · Rampage,立绘,768x1024):三米高装甲鳞甲巨兽,断裂犄角冒火,"
    "破城形态全身熔火裂纹,口器滴落岩浆,全身站姿贴画面底缘。"
)
BOSS_RAW_CRITERIA = (
    "【判据】本素材要求背景绝对纯黑、无反光/无光晕/无渐变/无地面倒影:"
    "①背景绝对纯黑:背景应基本为纯黑或近黑平面(可接受极淡噪点,不可有地面反光、光晕、渐变灰、辉光);"
    "②全身完整:巨兽全身(含脚/蹄/尾部)完整可见,无被裁切,五官/犄角/口器清晰;"
    "③无白描边/光晕/反光:角色轮廓边缘为清晰干净的发光/描边或纯轮廓,不得出现大面积白色泛光、地面反光、透明残留。"
    "④对象正确:应为装甲鳞甲巨兽造型(犄角冒火/熔火裂纹/岩浆口器),不是人类、不是普通野兽。"
)
# ---- BOSS cut ----
BOSS_CUT_CRITERIA = (
    "【判据】(cutout 抠图结果)①背景干净透明:非主体区域应全部透明,无背景残留/杂点/半透残影;"
    "②主体连续完整:巨兽主体边缘清晰,无破洞、无缺块,五官/犄角/口器完整可辨;"
    "③无白描边/光晕残留:轮廓处无大面积白边、半透光晕、反光残留;④无平台/地面阴影残留。"
)

JOBS = [
    ("command", os.path.join(ROOT, "raw_moshi", "scene_command_v1.png"),
     ROLE + COMMAND_SETTING + COMMAND_CRITERIA + COMMAND_TASK),
    ("observatory", os.path.join(ROOT, "raw_moshi", "scene_observatory_v1.png"),
     ROLE + OBSERVATORY_SETTING + OBSERVATORY_CRITERIA + COMMAND_TASK),
    ("boss_raw", os.path.join(ROOT, "raw_moshi", "boss_siege_beast_raw.png"),
     ROLE + BOSS_SETTING + BOSS_RAW_CRITERIA + COMMAND_TASK),
    ("boss_cut", os.path.join(ROOT, "cutout_out", "boss_siege_beast_cut.png"),
     ROLE + BOSS_SETTING + BOSS_CUT_CRITERIA + COMMAND_TASK),
]

if __name__ == "__main__":
    ok_all = True
    for name, path, prompt in JOBS:
        print("\n\n\n@@@@@@@@@@@@@@@@@@ START QC: %s @@@@@@@@@@@@@@@@@@" % name, flush=True)
        ok = qc(path, prompt)
        print("@@@@ RESULT:%s :: %s @@@@" % ("OK" if ok else "FAIL", name), flush=True)
        if not ok:
            ok_all = False
    print("ALL_OK=%s" % ok_all, flush=True)
    sys.exit(0 if ok_all else 1)