# -*- coding: utf-8 -*-
"""bg_p0b_edit.py — 背景池引用替换：把 8 副本 scenes 文件里的占位 img_* bg 替换为新 bg 池。
统一占位(整文件唯一映射)用全局替换；语义路由(同一占位/既有图按场景分派)用按场景块精确替换。
用法: comfy_python bg_p0b_edit.py
"""
import os
import re

SRC_DIR = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src"

# ---- 全局替换：整文件内某占位 -> 固定新 bg ----
GLOBAL = {
    "scenes_sishen.rs": {
        'img_train.png': "sishen_bg_open.png",
        'img_corridor.png': "sishen_bg_battle.png",
        "img_zhuyuan_book.png": "sishen_bg_invest.png",
    },
    "scenes_mumiyi.rs": {
        "img_zhuyuan_book.png": "mumiyi_bg_open.png",
        'img_laser.png': "mumiyi_bg_invest.png",
        'img_redqueen.png': "mumiyi_bg_battle.png",
    },
    "scenes_xinghe.rs": {
        'img_horde.png': 'xinghe_bg_open.png',
        'img_corridor.png': 'xinghe_bg_invest.png',
        'img_laser.png': 'xinghe_bg_battle.png',
    },
    "scenes_juluoji.rs": {
        "img_zhuyuan_book.png": "juluoji_bg_open.png",
        'img_horde.png': 'juluoji_bg_invest.png',
        'img_laser.png': 'juluoji_bg_battle.png',
    },
    "scenes_yiying.rs": {
        'img_corridor.png': 'yiying_bg_open.png',
        'img_train.png': 'yiying_bg_open.png',
        'img_horde.png': 'yiying_bg_invest.png',
        'img_sterile_lab.png': 'yiying_bg_invest.png',
        'img_isolation.png': 'yiying_bg_invest.png',
        'img_redqueen.png': 'yiying_bg_battle.png',
        'img_laser.png': 'yiying_bg_battle.png',
    },
}

# ---- 按场景块精确替换：{file: {scene_id: (old_bg_exact_or_None, new_bg)}} ----
# old_bg_exact: 若不指定(None)仅要求该块旧值是 img_* 占位；否则要求等于给定值(可替换既有非占位)。
PER_SCENE = {
    "scenes_moruiya.rs": {
        # 矿坑大厅/西闸门/柱厅 -> OPEN
        "mo_lake": (None, "moruiya_bg_open.png"),
        "mo_watcher_fight": (None, "moruiya_bg_open.png"),
        "mo_watcher_after": (None, "moruiya_bg_open.png"),
        "mo_02_hall": (None, "moruiya_bg_open.png"),
        "mo_rune": (None, "moruiya_bg_open.png"),
        "mo_rune_scout": (None, "moruiya_bg_open.png"),
        # 矿坑内部/书库/金库/矿车 -> INVEST
        "mo_collapse": (None, "moruiya_bg_invest.png"),
        "mo_south_ambush": (None, "moruiya_bg_invest.png"),
        "mo_book": (None, "moruiya_bg_invest.png"),
        "mo_drum_ambush_scene": (None, "moruiya_bg_invest.png"),
        "mo_chest": (None, "moruiya_bg_invest.png"),
        "mo_stair": (None, "moruiya_bg_invest.png"),
        "mo_vault": (None, "moruiya_bg_invest.png"),
        "mo_vault_take": (None, "moruiya_bg_invest.png"),
        "mo_vault_check": (None, "moruiya_bg_invest.png"),
        "mo_cart": (None, "moruiya_bg_invest.png"),
        "mo_cart_ride": (None, "moruiya_bg_invest.png"),
        "mo_npc_gandalf": (None, "moruiya_bg_invest.png"),
        "mo_npc_boromir": (None, "moruiya_bg_invest.png"),
        "mo_npc_gimli": (None, "moruiya_bg_invest.png"),
        "mo_npc_troll": (None, "moruiya_bg_invest.png"),
        "mo_troll_fight": (None, "moruiya_bg_invest.png"),
        # 石桥/凯撒督姆/断桥/东门 -> BATTLE
        "mo_bridge_desc": (None, "moruiya_bg_battle.png"),
        "mo_boss_round": (None, "moruiya_bg_battle.png"),
        "mo_ending_survive": (None, "moruiya_bg_battle.png"),
        "mo_ending_sacrifice": (None, "moruiya_bg_battle.png"),
        "mo_exit": (None, "moruiya_bg_battle.png"),
    },
    "scenes_dashengtang.rs": {
        "ds_prelude": ('img_laser.png', "dashengtang_bg_battle.png"),
        "ds_round": ('img_laser.png', "dashengtang_bg_battle.png"),
        "ds_01": ("img_zhuyuan_book.png", "dashengtang_bg_invest.png"),
        "ds_crypt": ("dashengtang_bg.png", "dashengtang_bg_invest.png"),
        "ds_reliquary": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
        "ds_chandelier": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
        "ds_tanhai": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
        "ds_acolyte": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
        "ds_verger": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
        "ds_gather": ("dashengtang_bg.png", "dashengtang_bg_open.png"),
    },
    "scenes_wujin.rs": {
        "wj_01": ("img_zhuyuan_book.png", "wujin_bg_battle.png"),
        "wj_round": ('img_laser.png', "wujin_bg_battle.png"),
        "wj_00": ("wujin_bg.png", "wujin_bg_open.png"),
        "wj_pt_totem": ("wujin_bg.png", "wujin_bg_open.png"),
        "wj_pt_victims": ("wujin_bg.png", "wujin_bg_open.png"),
        "wj_pt_pool": ("wujin_bg.png", "wujin_bg_open.png"),
        "wj_hub": ("wujin_bg.png", "wujin_bg_invest.png"),
        "wj_pt_altar": ("wujin_bg.png", "wujin_bg_invest.png"),
        "wj_pt_stele": ("wujin_bg.png", "wujin_bg_invest.png"),
        "wj_np_hunter": ("wujin_bg.png", "wujin_bg_invest.png"),
        "wj_np_elder": ("wujin_bg.png", "wujin_bg_invest.png"),
        "wj_01b_prep": ("wujin_bg.png", "wujin_bg_battle.png"),
        "wj_end_choice": ("wujin_bg.png", "wujin_bg_battle.png"),
    },
}


def global_replace(path, mapping):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    edits = []
    for old_img, new_bg in mapping.items():
        pat = re.compile(r'(bg:\s*Some\(")' + re.escape(old_img) + r'("\))')
        # count occurrences
        n = len(pat.findall(text))
        text = pat.sub(lambda m: m.group(1) + new_bg + m.group(2), text)
        if n:
            edits.append("%s x%d -> %s" % (old_img, n, new_bg))
    if text != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        return edits
    return edits


def per_scene_replace(path, scene_map):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    edits = []
    for scene_id, (old_bg, new_bg) in scene_map.items():
        marker = 'id: "%s"' % scene_id
        if marker not in text:
            edits.append("MISSING_SCENE %s" % scene_id)
            continue
        idx = text.index(marker)
        block_end = len(text)
        nxt = text.find("SceneDef {", idx + 1)
        if nxt != -1:
            block_end = nxt
        block = text[idx:block_end]
        pat = re.compile(r'(bg:\s*Some\(")[^"]*("\))')
        m = pat.search(block)
        if not m:
            edits.append("NO_BG %s" % scene_id)
            continue
        old_val = m.group(0)
        if not old_val.startswith('bg: Some("img_'):
            if old_bg is None or old_bg not in old_val:
                edits.append("OLD_MISMATCH %s (%s)" % (scene_id, old_val))
                continue
        new_line = 'bg: Some("%s")' % new_bg
        new_block = block.replace(old_val, new_line, 1)
        text = text[:idx] + new_block + text[block_end:]
        edits.append("%s: %s -> %s" % (scene_id, old_val, new_line))
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return edits


def main():
    report = {}
    total_edits = 0
    for fname, mapping in GLOBAL.items():
        if not os.path.exists(os.path.join(SRC_DIR, fname)):
            report[fname] = ["FILE_MISSING"]
            continue
        edits = global_replace(os.path.join(SRC_DIR, fname), mapping)
        report[fname] = edits
        total_edits += len(edits)
        print("[GLOBAL] %s: %s" % (fname, edits), flush=True)
    for fname, scene_map in PER_SCENE.items():
        if not os.path.exists(os.path.join(SRC_DIR, fname)):
            report[fname] = ["FILE_MISSING"]
            continue
        edits = per_scene_replace(os.path.join(SRC_DIR, fname), scene_map)
        report[fname] = edits
        total_edits += len(edits)
        print("[PERSCENE] %s: %d edits" % (fname, len(edits)), flush=True)
        for e in edits:
            print("    %s" % e, flush=True)
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_bg_p0b_edit_out.json"), "w", encoding="utf-8") as f:
        import json
        json.dump({"total_edits": total_edits, "report": report}, f, ensure_ascii=False, indent=2)
    print("=== TOTAL EDITS: %d ===" % total_edits, flush=True)
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
