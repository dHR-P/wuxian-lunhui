# -*- coding: utf-8 -*-
"""bg_batch_p0_deploy.py — 部署 QC 通过的 bg 到 assets/img，并替换 5 副本 scenes 占位引用。
用法: D:\\AI_Tools\\ComfyUI\\python_embeded\\python.exe bg_batch_p0_deploy.py  <qc_summary.json>
qc_summary.json: {"name":"PASS|FAIL", ...}
"""
import os, sys, json, shutil, re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_bg_batch_p0")
IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
SRC = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src"

qc = json.load(open(sys.argv[1], encoding="utf-8"))

# name -> 目标 assets 文件名（<slug>_bg_<type>.png）
ASSET = {
    "bs_bg_airport": "bs_bg_airport.png",
    "bs_bg_highway": "bs_bg_highway.png",
    "bs_bg_mall": "bs_bg_mall.png",
    "bs_bg_cinema": "bs_bg_cinema.png",
    "xingjichuanqi2_bg_mine": "xingjichuanqi2_bg_mine.png",
    "xingjichuanqi2_bg_hospital": "xingjichuanqi2_bg_hospital.png",
    "jialebi_bg_deck": "jialebi_bg_deck.png",
    "jialebi_bg_cove": "jialebi_bg_cove.png",
    "shenghua3_bg_underground": "shenghua3_bg_underground.png",
    "shenghua3_bg_lab": "shenghua3_bg_lab.png",
    "jishujing_bg_boiler": "jishujing_bg_boiler.png",
    "jishujing_bg_highschool": "jishujing_bg_highschool.png",
}

# 目标文件 -> {scene_id: new_bg}
# 仅替换 通过 QC 的 bg
SCENES = {
    "scenes_baisun.rs": {
        "bs_00": "bs_bg_airport.png",
        "bs_l1_hub": "bs_bg_highway.png", "bs_01_crane": "bs_bg_highway.png",
        "bs_01_slip": "bs_bg_highway.png", "bs_01_car": "bs_bg_highway.png",
        "bs_01_box": "bs_bg_highway.png", "bs_02_guard": "bs_bg_highway.png",
        "bs_10_drop": "bs_bg_highway.png",
        "bs_l2_hub": "bs_bg_mall.png", "bs_04_handrail": "bs_bg_mall.png",
        "bs_04_cabinet": "bs_bg_mall.png", "bs_04_sign": "bs_bg_mall.png",
        "bs_04_duct": "bs_bg_mall.png", "bs_05_clerk": "bs_bg_mall.png",
        "bs_06_gate2": "bs_bg_mall.png", "bs_11_elev": "bs_bg_mall.png",
        "bs_l3_hub": "bs_bg_cinema.png", "bs_07_projector": "bs_bg_cinema.png",
        "bs_07_extinguisher": "bs_bg_cinema.png", "bs_07_sprinkler": "bs_bg_cinema.png",
        "bs_07_sign": "bs_bg_cinema.png", "bs_08_janitor": "bs_bg_cinema.png",
        "bs_12_fire": "bs_bg_cinema.png", "bs_garage": "bs_bg_cinema.png",
        "bs_boss_round": "bs_bg_cinema.png", "bs_boss_win": "bs_bg_cinema.png",
        "bs_09_gate3": "bs_bg_cinema.png", "bs_settle": "bs_bg_cinema.png",
    },
    "scenes_xingjichuanqi2.rs": {
        "xj2_01_l1_hub": "xingjichuanqi2_bg_mine.png",
        "xj2_02_rail": "xingjichuanqi2_bg_mine.png", "xj2_02_shaft": "xingjichuanqi2_bg_mine.png",
        "xj2_02_well": "xingjichuanqi2_bg_mine.png", "xj2_02_cage": "xingjichuanqi2_bg_mine.png",
        "xj2_05_lamp": "xingjichuanqi2_bg_mine.png",
        "xj2_04_l3_hub": "xingjichuanqi2_bg_hospital.png", "xj2_04_reg": "xingjichuanqi2_bg_hospital.png",
        "xj2_04_ward": "xingjichuanqi2_bg_hospital.png", "xj2_04_roof": "xingjichuanqi2_bg_hospital.png",
        "xj2_07_night": "xingjichuanqi2_bg_hospital.png",
    },
    "scenes_jialebi.rs": {
        "jb_l1_hub": "jialebi_bg_deck.png", "jb_01_wheel": "jialebi_bg_deck.png",
        "jb_01_mast": "jialebi_bg_deck.png", "jb_01_barrel": "jialebi_bg_deck.png",
        "jb_01_cabin": "jialebi_bg_deck.png", "jb_npc_cook": "jialebi_bg_deck.png",
        "jb_l1_fight": "jialebi_bg_deck.png",
        "jb_l2_hub": "jialebi_bg_cove.png", "jb_02_chest": "jialebi_bg_cove.png",
        "jb_02_wreck": "jialebi_bg_cove.png", "jb_02_plank": "jialebi_bg_cove.png",
        "jb_02_anchor": "jialebi_bg_cove.png", "jb_npc_pirate": "jialebi_bg_cove.png",
        "jb_l2_fight": "jialebi_bg_cove.png",
    },
    "scenes_shenghua3.rs": {
        "sh3_01_l1_hub": "shenghua3_bg_underground.png", "sh3_02_gate": "shenghua3_bg_underground.png",
        "sh3_02_valve": "shenghua3_bg_underground.png", "sh3_02_machine": "shenghua3_bg_underground.png",
        "sh3_02_corpse": "shenghua3_bg_underground.png", "sh3_10_sewage_ok": "shenghua3_bg_underground.png",
        "sh3_05_survive": "shenghua3_bg_underground.png",
        "sh3_04_l3_hub": "shenghua3_bg_lab.png", "sh3_04_morgue": "shenghua3_bg_lab.png",
        "sh3_04_console": "shenghua3_bg_lab.png", "sh3_04_vat": "shenghua3_bg_lab.png",
        "sh3_04_data": "shenghua3_bg_lab.png", "sh3_07_doctor": "shenghua3_bg_lab.png",
        "sh3_09_boss_round": "shenghua3_bg_lab.png", "sh3_30_final_choice": "shenghua3_bg_lab.png",
        "sh3_31_spare": "shenghua3_bg_lab.png", "sh3_32_feed": "shenghua3_bg_lab.png",
        "sh3_33_blowup": "shenghua3_bg_lab.png", "sh3_05_win": "shenghua3_bg_lab.png",
    },
    "scenes_jishujing.rs": {
        "jj2_l3_hub": "jishujing_bg_boiler.png", "jj2_l3_boiler": "jishujing_bg_boiler.png",
        "jj2_l3_memory": "jishujing_bg_boiler.png", "jj2_l3_mirror": "jishujing_bg_boiler.png",
        "jj2_l3_wall": "jishujing_bg_boiler.png", "jj2_l3_ghost": "jishujing_bg_boiler.png",
        "jj2_l3_flash": "jishujing_bg_boiler.png", "jj2_fight_l3": "jishujing_bg_boiler.png",
        "jj2_l2_hub": "jishujing_bg_highschool.png", "jj2_l2_desk": "jishujing_bg_highschool.png",
        "jj2_l2_clock": "jishujing_bg_highschool.png", "jj2_l2_window": "jishujing_bg_highschool.png",
        "jj2_l2_furnace_door": "jishujing_bg_highschool.png", "jj2_l2_teacher": "jishujing_bg_highschool.png",
        "jj2_fight_l2": "jishujing_bg_highschool.png",
    },
}

# 1) 部署 assets
deployed = []
for name, verdict in qc.items():
    if verdict != "PASS":
        continue
    src_png = os.path.join(RAW, name + ".png")
    dst = os.path.join(IMG, ASSET.get(name, name + ".png"))
    if not os.path.exists(src_png):
        print("MISSING raw", name, flush=True); continue
    shutil.copyfile(src_png, dst)
    deployed.append(ASSET.get(name, name + ".png"))
    print("DEPLOY", name, "->", dst, flush=True)

# 2) 替换 scenes 占位引用
new_bg_set = {ASSET[k] for k in qc if qc[k] == "PASS"}
repl_count = 0
for fn, mapping in SCENES.items():
    path = os.path.join(SRC, fn)
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    for sid, newbg in mapping.items():
        if newbg not in new_bg_set:
            print("SKIP scene (bg not passed)", sid, newbg, flush=True)
            continue
        # 匹配 SceneDef 中该 id 后的 bg: Some("...")
        pat = re.compile(r'(id:\s*"' + re.escape(sid) + r'",[ \t]*bg:\s*Some\(")[^"]+("\))')
        text, n = pat.subn(r'\g<1>' + newbg + r'\g<2>', text)
        repl_count += n
        if n == 0:
            print("WARN no match for", sid, "in", fn, flush=True)
    if text != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print("REPLACED in", fn, flush=True)

print("=== DEPLOY SUMMARY ===", flush=True)
for d in deployed:
    print("ASSET", d, flush=True)
print("SCENE_REPLACEMENTS", repl_count, flush=True)
