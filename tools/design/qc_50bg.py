# -*- coding: utf-8 -*-
"""qc_50bg.py — GLM visual QA for 12 dungeon scene backgrounds.
Reads raw_50bg/<slug>_bg.png, calls glm_qc.py 'raw_bg' kind, prints verdicts.
Encoding-safe for Windows gbk console.
"""
import os, subprocess, sys, io

# force utf-8 stdout on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_50bg")
GLM = os.path.join(BASE, "glm_qc.py")
PY = sys.executable

DESC = {
    "jingjiling": "寂静岭：冷灰雾小镇，锈蚀铁网，废弃学校，冷灰色调空镜",
    "xingjichuanqi": "星际传奇：C系行星荒原，沙金戈壁，双日当空，苍白日光，遗迹，沙金+苍白空镜",
    "jishengqianye": "寄生前夜：歌剧院舞台废墟，幽蓝生物荧光，血红帷幕，空镜",
    "mengguijie": "猛鬼街：高中锅炉房，梦境扭曲走廊，暗红色调空镜",
    "siwuzhen": "死雾镇：灰雾破败小镇街道，枯树，苍白空镜",
    "shenmiao": "沉没神殿：海底倒悬神殿，水向天上流，深蓝幽光空镜",
    "hangu": "函谷关：人类城墙雄关，烽火，荒原夜色空镜",
    "diweidu": "低纬度：现实世界倒影碎片，扭曲城市天际线空镜",
    "wujin": "无尽森林：幽暗莽林，巨木，迷雾空镜",
    "xingchen": "星辰吞噬者：巨兽体内星骸，引力扭曲，天体光辉空镜",
    "yinxiang": "银色战争：太空舰桥残骸，破损舱段，真空星光空镜",
    "tianwang": "天网：地下机械核心，T800生产线，冷金属+红眼空镜",
}

def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    # preserve original args for re-runs passed after
    tail = [a for a in sys.argv[1:]]
    for slug, desc in DESC.items():
        if only and slug not in only:
            continue
        img = os.path.join(RAW, "%s_bg.png" % slug)
        if not os.path.exists(img):
            print("=== %s MISSING" % slug, flush=True)
            continue
        md = os.path.join(RAW, "%s_bg_qc.md" % slug)
        r = subprocess.run([PY, GLM, img, "raw_bg", desc, md],
                           capture_output=True)
        out = r.stdout.decode("utf-8", errors="replace")
        err = r.stderr.decode("utf-8", errors="replace")
        verdict = None
        for ln in (out + err).splitlines():
            if ln.startswith("VERDICT:"):
                verdict = ln.split(":", 1)[1].strip()
        # read the md content regardless
        txt = ""
        if os.path.exists(md):
            with open(md, "r", encoding="utf-8") as f:
                txt = f.read().strip()
            if not verdict:
                verdict = "PASS" if "PASS" in txt else "FAIL"
        print("=== %s => %s" % (slug, verdict or "?"), flush=True)
        print("   tail:", txt[-80:].replace("\n", " / ") if txt else "(empty)", flush=True)

if __name__ == "__main__":
    main()