# -*- coding: utf-8 -*-
"""regen_all.py — 兜底重生成指定 IDs(全黑底,全身贴底,严格禁白晕)。用法: python regen_all.py id [id...]
"""
import os, re, subprocess, sys, time

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
TOOLS = os.path.join(BASE, "tools", "design")
RAW = os.path.join(TOOLS, "raw_enemy")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
GEN = os.path.join(TOOLS, "gen_wan.py")
os.environ["PYTHONIOENCODING"] = "utf-8"

# 强化:明确整套全身、绝对无白晕/白色描边/白色发光的字面描述
REQUIRE = (
    "。主体必须是完整的全身立绘、脚部贴合画面底边(贴底)呈现完整站姿，主体占据画面高度约90%正面或略斜视角。"
    "背景必须是纯黑色(#000000)纯色，主体边缘与黑底之间绝不允许任何白色描边、白色光晕、白色外发光、白雾、白色渐变边缘，"
    "主体暗部与背景融合也绝不能出现淡白色亮边，只允许用主体自身的暗部高光勾勒轮廓，黑底保持纯净无杂色。"
    "切记:绝对不能给主体画白色轮廓线或白色描边，主体整体配色要避免边缘发白，背景与主体交界处必须是纯黑到主体固有色的直接过渡，无任何白色过渡环"
)

REGEN3 = (
    "。重申硬性约束:这是纯黑底游戏立绘素材，主体四周绝不允许有一丁点白色或浅色描边/光晕/外发光/白雾。"
    "主体与纯黑背景之间必须直接、干脆地衔接，边界就是主体本身固有色的最暗边沿，没有额外加亮。"
    "若主体本身含浅色部位(如白衣/白肤/发光器官)，这些浅色只存在于主体内部，不允许在主体轮廓之外溢出白芒。"
    "确保边缘像素为纯黑或主体最暗色，不得出现纯白或灰白描边像素。全身贴底站姿"
)

PROMPTS = {
    "brain_bug": "科幻恐怖片《星河战队》中的脑虫(Brain Bug)：超大的暗紫色血肉肥大脑体，表面皱褶血管结节，下方细小触须，口器大张尖啸，科幻怪物CG立绘" + REQUIRE,
    "yiy_queen": "科幻恐怖电影《异形》中的异形皇后(Alien Queen)：巨大修长黑甲生物，锯齿背甲，长辫头冠，张开的巨口嵌套锋利内齿，口器滴绿色酸液，长尾羊卵状产卵器，恐怖生物立绘" + REQUIRE,
    "yiy_facehugger": "《异形》抱脸虫(Facehugger)：灰白色扁平长尾寄生物，展开八条细长利爪腿，环绕长尾卷曲，口器外翻，贴地爬行攻击姿态，恐怖生物立绘" + REQUIRE,
    "yiy_worker": "《异形》工蜂异形(Alien Drone)：深黑泛蓝光泽多节黑甲躯干，光滑长头，锋利内齿口器，细长刃状尾部翘起，四肢修长凶悍，恐怖生物立绘" + REQUIRE,
    "gregor": "吸血鬼恐怖片《嗜血破晓》变异巨兽格里高尔：灰白惨白皮肤、膨胀撕裂肌肉、巨大獠牙外翻、狰狞吼叫的巨大人形怪物，恐怖怪物立绘" + REQUIRE,
    "tyrant": "恐怖游戏《生化危机3》追踪者·复仇女神：灰皮肤巨汉、光头、粗壮肌肉、深色皮衣、右手旋转机枪火箭炮、身后缠血肉触手、冷漠威慑站姿" + REQUIRE,
    "barbossa": "奇幻电影《加勒比海盗》亡灵船长巴博萨：骷髅腐破面孔、船长呢绒大衣三角帽、皮肤剥落露白骨、手持燧发手枪与弯刀、亡灵船长全身" + REQUIRE,
    "freddy2": "恐怖片《猛鬼街》梦魇弗莱迪：脸部烧伤毁容露肌与齿、深棕礼帽、红绿条纹毛衣、右手金属刀爪手套、阴冷笑意" + REQUIRE,
    "pyramid": "恐怖游戏《寂静岭2》三角头(Pyramid Head)：暗红脏污围裙巨大人形、头部金属大三角锥头盔(锈迹)、手拄巨大锈蚀开山巨刀、沉默压迫站姿" + REQUIRE,
    "deep": "深海恐怖生物：来自深渊的庞大邪物，幽蓝暗绿的半透明触手缠结，体表细密发光疤点(蓝色辉光)，无数吸盘触手乱舞，黑暗深海氛围克苏鲁风" + REQUIRE,
    "kage": "古代战阵boss谷关军团长箜邪：狂化蛮族军团长、重型铁锈战盔、厚重蛮铁甲兽皮、双眼赤红狂怒、手持巨柄战斧与盾牌、咆哮冲阵姿态" + REQUIRE,
    "sword": "剑冢之灵：由无数暗铁枯剑聚合成的剑灵人形，通体古旧铁锈色，身体由层层叠叠断裂刀剑交错拼接，剑刃森然，浮着淡淡剑气幽光" + REQUIRE,
    "zhen": "天庭神将封神投影：华丽金色甲胄神将、头盔缀缨穗、铠甲流光滑亮、手持长戟与盾、圣洁金光披风飘动、庄严威猛" + REQUIRE,
    "poxu": "法则化身破虚异界来者：半透明由星辰法则与虚空纹路构成的人形、通体半透明辉光(浅紫/青白)内部自行发光但绝不外泄、轮廓虚渺、周围飘破碎法则符文光点" + REQUIRE,
    "watcher": "异位面盒外观测者的信息聚合体：无数微小几何信息体与光点聚合成的半透明人形轮廓、头部多面棱镜状、身上流动蓝青光纹与显示符文、虚渺发光" + REQUIRE,
}

def gen_one(cid, attempt_max=2):
    out = os.path.join(RAW, cid + ".png")
    prompt = PROMPTS.get(cid, cid) + REQUIRE + REGEN3
    for attempt in range(1, attempt_max + 1):
        print("== REGEN %s try%d ==" % (cid, attempt), flush=True)
        ok = subprocess.run([PY, "-c",
            "import sys;sys.path.insert(0,r'%s');from gen_wan import gen;"
            "sys.exit(0 if gen(r'%s','768x1024',r'%s') else 1)" % (TOOLS, prompt, out)],
            capture_output=False).returncode == 0
        if ok and os.path.exists(out) and os.path.getsize(out) > 1000:
            print("REGEN OK %s (%d)" % (cid, os.path.getsize(out)), flush=True)
            return True
        time.sleep(3)
    return False

def main():
    for cid in sys.argv[1:]:
        gen_one(cid)
    print("REGEN_DONE")

if __name__ == "__main__":
    main()
