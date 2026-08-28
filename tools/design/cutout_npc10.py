# -*- coding: utf-8 -*-
"""cutout_npc10.py — 批量 floodfill 抠图 + 部署 10 类职业型 NPC。
输入: tools/design/raw_npc10/<slug>.png  (纯黑底 raw)
输出: server-rs/ui/assets/img/npc_<type>.png  (透明 PNG)
参数与 monster_10 / npc_item_assets 一致:
  threshold=16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
用法: <comfy-python> cutout_npc10.py [slug...]   # 缺省=全部
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))       # tools/design
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # tools
from cutout_floodfill import cutout  # noqa: E402

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_npc10")
DEPLOY = os.path.join(BASE, "server-rs", "ui", "assets", "img")

ALL = ["npc_guard", "npc_survivor", "npc_watcher", "npc_merchant",
       "npc_doctor", "npc_soldier", "npc_villager", "npc_elder",
       "npc_child", "npc_woman"]

# slug -> 最终采用源文件(v2 retry / v4 严格平黑重生成)
FINAL_SRC = {
    "npc_survivor": "npc_survivor_v2.png",
    "npc_guard": "npc_guard_v4.png",
    "npc_merchant": "npc_merchant_v4.png",
    "npc_doctor": "npc_doctor_v4.png",
    "npc_soldier": "npc_soldier_v4.png",
    "npc_elder": "npc_elder_v4.png",
}


def main():
    args = sys.argv[1:]
    targets = args if args else ALL
    os.makedirs(DEPLOY, exist_ok=True)
    for slug in targets:
        srcfn = FINAL_SRC.get(slug, slug + ".png")
        src = os.path.join(RAW, srcfn)
        if not os.path.exists(src):
            print("skip missing %s" % src, flush=True)
            continue
        dst = os.path.join(DEPLOY, slug + ".png")
        cutout(src, dst, threshold=16.0, seal=2, closing=1, feather=2,
               fix_holes=True, conn=4, hole_channel=6, hole_solid=True,
               zero_rgb=True)
        print("DEPLOY %s -> %s" % (slug, dst), flush=True)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
