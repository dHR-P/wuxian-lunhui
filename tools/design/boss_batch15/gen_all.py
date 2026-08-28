# -*- coding: utf-8 -*-
"""gen_all.py — 批量生成 15 张 BOSS/精英立绘(纯黑底)并逐个落盘。
每张调用 tools/design/gen_wan.py 的 gen(),最多重试。输出到 raw_enemy/<id>.png
"""
import os, subprocess, sys, time

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
TOOLS = os.path.join(BASE, "tools", "design")
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
GEN = os.path.join(TOOLS, "gen_wan.py")

os.environ["PYTHONIOENCODING"] = "utf-8"

BLACK_SUFFIX = (
    "，纯黑色背景(#000000)，主体完整全身贴底站立占据画面，主体边缘不允许任何白色光晕或"
    "白色描边，不允许白色外发光，主体与纯黑背景之间不允许白雾或白色渐变边缘，绝对无白晕，"
    "主体和背景界限清晰，仅用高光勾勒轮廓，全身立绘"
)

JOBS = [
    ("brain_bug", "科幻恐怖片《星河战队》中的脑虫(Brain Bug)：一个超大的暗紫色血肉肥大脑体，表面布满皱褶与血管结节，下方有细小触须，口器大张做尖啸姿态，科幻怪物CG立绘"),
    ("yiy_queen", "科幻恐怖电影《异形》中的异形皇后(Alien Queen)：巨大修长的黑甲外壳生物，高耸锯齿背甲，长辫状头冠，张开的巨口中嵌套锋利内齿，口器滴落绿色酸液，长爪裂开的羊卵状产卵器，恐怖生物CG立绘"),
    ("yiy_facehugger", "科幻恐怖电影《异形》中的抱脸虫(Facehugger)：灰白色/棕色的扁平长尾形寄生物，展开八条细长利爪腿，环绕式长尾卷曲，头部口器外翻，贴地爬行攻击姿态，恐怖生物CG立绘"),
    ("yiy_worker", "科幻恐怖电影《异形》中的工蜂异形(Alien Drone)：深黑泛蓝光泽的多节黑甲躯干，光滑修长头部，长条后脑勺，带锋利内齿的口器，细长刃状尾部翘起，四肢修长凶悍，恐怖生物CG立绘"),
    ("gregor", "吸血鬼恐怖电影《嗜血破晓》中的变异巨兽格里高尔：被病毒突变后的巨大人形怪物，灰白惨白皮肤，膨胀撕裂的肌肉，巨大獠牙外翻，狰狞吼叫，体型巨大凶悍，恐怖怪物CG立绘"),
    ("tyrant", "恐怖游戏《生化危机3》中的追踪者·复仇女神(Nemesis/N型暴君)：灰色皮肤的无敌巨汉，光头，粗壮肌肉，身穿深色皮衣，右手持旋转机枪火箭炮重兵器，身后缠着血肉触手，冷漠威慑站姿，恐怖怪物CG立绘"),
    ("barbossa", "奇幻电影《加勒比海盗》中的亡灵船长巴博萨：腐烂骷髅面孔身披船长呢绒大衣与三角帽，皮肤剥落露出森森白骨，手持燧发手枪与弯刀，亡灵船长全身立绘，暗黑奇幻CG"),
    ("freddy2", "恐怖电影《猛鬼街》中的梦魇弗莱迪：脸部严重烧伤毁容露出肌肉与牙齿，头戴深棕礼帽，身穿红绿条纹毛衣，右手套着寒光金属刀爪手套，阴冷笑意，恐怖怪物CG立绘"),
    ("pyramid", "恐怖游戏《寂静岭2》中的三角头(Pyramid Head)：身穿暗红脏污围裙的巨大男性身形，头部戴一座巨大的金属三角锥头盔(锈迹斑斑)，手拄一把巨大的锈蚀开山巨刀，沉默压迫站姿，恐怖怪物CG立绘"),
    ("deep", "深海恐怖生物：来自深渊的庞大邪物，幽蓝暗绿的半透明触手缠结，体表布满细密发光疤点(蓝色辉光)，无数吸盘触手乱舞，黑暗深海氛围，克苏鲁风格恐怖生物CG立绘"),
    ("kage", "中国古代战阵boss谷关军团长箜邪：一个狂化的蛮族军团长，戴重型铁锈战盔，身披厚重蛮铁甲与兽皮，双眼赤红狂怒，手持巨柄战斧与盾牌，咆哮冲阵姿态，写实武侠风CG立绘"),
    ("sword", "剑冢之灵：由无数暗铁枯剑聚合而成的剑灵，人形剑堆轮廓，通体古旧铁锈色，身体由层层叠叠断裂刀剑交错拼接而成，剑刃森然，周身浮着淡淡剑气幽光，奇幻武侠CG立绘"),
    ("zhen", "天庭神将封神投影：一位身穿华丽金色甲胄的神将，头盔上缀缨穗，铠甲流光滑亮，手持长戟与盾，浑身散发圣洁金光披风飘动，庄严威猛，中国神话风格CG立绘"),
    ("poxu", "法则化身的破虚异界来者：一个半透明的、由星辰法则与虚空纹路构成的人形，通体半透明辉光(浅紫/青白)内部自行发光，轮廓虚渺不实，周围飘散破碎法则符文与光点，仙侠玄幻立绘"),
    ("watcher", "异位面盒外观测者的信息聚合体：一个由无数微小几何信息体与光点聚合成的半透明人形轮廓，头部呈多面棱镜状，身上流转蓝青光纹与显示屏样符文，虚渺发光，科幻怪诞立绘"),
]

def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    results = {}
    for i, (cid, desc) in enumerate(JOBS):
        if i < start:
            results[cid] = "skip"
            continue
        out = os.path.join(RAW, cid + ".png")
        prompt = desc + "，" + ("纯黑背景" + BLACK_SUFFIX if "poxu" not in cid else
                "纯黑色背景(#000000)，主体半透明内部发光但绝不向外晕开白光，发光严格限制在主体内部轮廓内，主体边缘绝对无外泄白晕无白色描边，与纯黑背景界限清晰，主体完整全身贴地站立，全身立绘")
        print("== GEN %s/%d %s ==" % (i + 1, len(JOBS), cid), flush=True)
        for attempt in range(1, 3):  # <=2 次重试
            ok = subprocess.run([PY, "-c",
                "import sys;sys.path.insert(0,r'%s');from gen_wan import gen;"
                "sys.exit(0 if gen(r'%s', '768x1024', r'%s') else 1)" % (TOOLS, prompt, out)],
                capture_output=False).returncode == 0
            if ok and os.path.exists(out) and os.path.getsize(out) > 1000:
                print("GEN OK %s (%d bytes)" % (cid, os.path.getsize(out)), flush=True)
                results[cid] = "ok"
                break
            print("GEN try%d fail %s" % (attempt, cid), flush=True)
            time.sleep(3)
        else:
            results[cid] = "fail(2retry)"
    print("GEN_RESULTS: %s" % results, flush=True)

if __name__ == "__main__":
    main()
