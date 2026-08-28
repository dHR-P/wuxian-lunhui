# -*- coding: utf-8 -*-
"""run_qc10.py — 跑全部 10 张 raw 质检（qwen3.7-flash），逐张打印判定。
用法: <comfy-python> run_qc10.py
"""
import os
import subprocess
import sys

PY = sys.executable
BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"
SLUGS = ["enemy_dragon", "enemy_demon", "enemy_undead", "enemy_golem", "enemy_oni",
         "enemy_cyborg", "enemy_slasher", "enemy_vampire", "enemy_werewolf", "enemy_tentacle"]


def main():
    for s in SLUGS:
        print("### QC raw %s" % s, flush=True)
        r = subprocess.run([PY, os.path.join(BASE, "qc_enemy10.py"), "raw", s],
                           cwd=BASE)
        print("### [%s] exit=%d" % (s, r.returncode), flush=True)


if __name__ == "__main__":
    main()
