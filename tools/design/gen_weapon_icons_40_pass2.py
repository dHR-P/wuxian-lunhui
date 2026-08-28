# -*- coding: utf-8 -*-
"""gen_weapon_icons_40_pass2.py — 第二轮: 对首轮 FAIL 的武器用修正 prompt 重新生图+质检+部署。
只处理仍未部署(item_<id>.png 不在正确 deploy 目录)的 FAIL item; 已 PASS 部署的跳过。
逐项写增量结果 JSON(单 item 异常不中断整个 run)。
输出: tools/design/item_icons/weapon_pass2_results.json
"""
import io
import json
import os
import shutil
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_weapon_icons_40 as G  # noqa: E402  (复用 gen, qc_icon, 常量)

STAGE2 = os.path.join(HERE, "item_icons", "weapon_pass2_stages")
os.makedirs(STAGE2, exist_ok=True)
OUT_JSON = os.path.join(HERE, "item_icons", "weapon_pass2_results.json")

# 每项: weapon_id, 中文名, 新 prompt 描述(去辉光/去文字/内容修正)
FIX = {
    "wp_zanjingdao_he": (
        "斩魄刀·卍解",
        "a single black Japanese zanpakutō katana in absolute release form, an ALL-BLACK "
        "slender blade with a sharp even curve, wrapped black-silk handle, plain small tsuba, "
        "one blade only. Full matte paint, no sheen bleeding out. No glow, no aura, no text."
    ),
    "wp_beam_saber": (
        "光束军刀",
        "a compact beam-saber hilt of dark cylindrical metal emitting a SINGLE straight cyan "
        "translucent energy blade. The cyan light is drawn as a flat clean solid bar, fully "
        "contained within the blade silhouette, with NO glow halo, NO bloom escaping to the "
        "black, no flare at the edges."
    ),
    "wp_pangu_fu": (
        "盘古开天斧",
        "a massive plain battle-axe with a broad rough stone-and-bronze double-bit head on a "
        "thick long wooden haft. Surface has ABSTRACT meandering grooves and damascus-like "
        "swirls ONLY, absolutely NO letters, NO runes, NO symbols, nothing readable, no text."
    ),
    "wp_zhuxian_sijian": (
        "诛仙四剑·合一",
        "EXACTLY FOUR straight jade swords of different colors (emerald, crimson, gold, azure) "
        "bound tightly together into one bundle and fanned out like a closed fan, tips together. "
        "Flat matte jade, no glow, no halo, no light leaked between them, count is exactly four."
    ),
    "wp_zhanxian_feidao": (
        "斩仙飞刀",
        "a slim ceremonial flying dagger-knife: one long slender blade with a small ring-jade "
        "pommel and a thin red tassel. NOT a bottle, no flask, no vial; it is a throwing knife. "
        "Matte metal, no glow, no text."
    ),
    "wp_fantian_yin": (
        "翻天印",
        "a heavy square celestial-print seal of dark bronze with a coiled dragon as its knob "
        "on top. The bottom and faces carry ABSTRACT swirling cloud relief ONLY, no characters, "
        "no seal script, no legible writing, no text."
    ),
    "wp_taiji_tu": (
        "太极图",
        "a flat taiji mandala: a clean black-and-white yin-yang disc in the center with an "
        "outer thin ring drawn of ABSTRACT geometric trigram line-segments (three-banded "
        "strokes as pure ornament, illegible). Flat 2D emblem, crisp edges, matte, NO glow, "
        "no halo, no color wash, no text."
    ),
    "wp_shanhe_shetu": (
        "山河社稷图",
        "a closed unrolled silk scroll used as a planar treasure, a horizontal hand-scroll "
        "showing a simple flat dark-ink mountain-and-river miniature painting on cream silk. "
        "Viewed as one neat scroll object, matte, NO glow, NO halo, no light aura around it."
    ),
    "wp_feijian_qingyun": (
        "青云飞剑",
        "a levitating straight cyan-metallic Chinese flying sword with a simple dark guard and "
        "wrapped hilt. Flat matte metal, the blade is plain and static with NO qi trail, NO "
        "glow, NO glow aura, just a clean cyan-tinted metal sword hovered vertically centered."
    ),
    "wp_plasma_dagger": (
        "等离子刺刃",
        "a short sci-fi combat dagger with a dark tech hilt whose blade is a glassy magenta "
        "translucent plasma edge drawn as a clean solid translucent bar. The energy light is "
        "contained strictly inside the blade silhouette, NO glow halo, NO bloom, no flare."
    ),
    "wp_laser_sword": (
        "纯激光剑",
        "a futuristic hilt emitting a single thin straight red energy blade drawn as a clean "
        "uniform translucent red bar. The light is completely flat and confined inside the "
        "blade, NO glow, NO halo, NO bloom leaking into the black, edges crisp."
    ),
    "wp_shuang_zhi_aisang": (
        "霜之哀伤",
        "a legendary black runeblade greatsword with a skull in the pommel and a slightly wavy "
        "blade. The hilt and blade are adorned with abstract frost-ice crystal carving and "
        "swirl ornament ONLY, absolutely no legible rune letters, no text. Cold light exists "
        "only as pale outline INSIDE the carved grooves, no outer glow aura, no halo."
    ),
    "wp_mo_jian_zhl": (
        "诅咒魔剑·噬主",
        "a sinister thin black cursed sword with a jagged edge and a single malevolent red eye "
        "set in the cross-guard. Red accents are abstract flowing vein-lines on the blade "
        "surface only, NO letters, NO readable text, NO runes; no glow aura beyond the blade."
    ),
    "wp_yitian_jian": (
        "倚天剑",
        "ONE single elegant upright Chinese straight double-edged jian sword, bright polished "
        "steel, simple wraparound guard and a tufted hilt. Exactly ONE blade, no second sword, "
        "no scabbard beside it. Matte even lighting, no outer glow, no text."
    ),
    "wp_xuantie_jian": (
        "玄铁重剑",
        "ONE single heavy dark slab-like jian sword made of black zhan iron, thick wide "
        "unadorned blade, no guard flourish, no second blade, no scabbard. Matte dark metal "
        "with a dull sheen confined to surface, no outer glow, no text."
    ),
    "wp_beiming_jian": (
        "北冥神功·吸星剑",
        "a sleek straight Chinese jian sword whose blade carries a subtle dark spiral swirl "
        "INLAY on its metal surface only. Flat matte, no vortex extending off the blade, no "
        "aura, no glow halo around the sword, no text, one blade."
    ),
}


def main():
    # 增量读取已有结果
    results = {}
    if os.path.exists(OUT_JSON):
        try:
            with open(OUT_JSON, "r", encoding="utf-8") as f:
                results = json.load(f)
        except Exception:
            results = {}
    # 跳过已正确部署的 item
    todo = {}
    for wid, (cname, desc) in FIX.items():
        deploy = os.path.join(G.DEPLOY_DIR, "item_%s.png" % wid)
        if results.get(wid, {}).get("status") == "PASS" and os.path.exists(deploy):
            print("skip %s (already deployed)" % wid, flush=True)
            continue
        todo[wid] = (cname, desc)

    for wid, (cname, desc) in todo.items():
        stage = os.path.join(STAGE2, wid + ".png")
        prompt = G.COMMON + desc
        expect = "%s（%s）" % (cname, wid)
        print("\n[PASS2] %s %s ..." % (wid, cname), flush=True)
        verdict = "FAIL"
        raw = ""
        tries = 0
        passed = False
        try:
            while tries < 3:
                tries += 1
                ok = G.gen(prompt, "768x768", stage)
                if not ok:
                    raw = "GEN_FAIL"
                    continue
                verdict, raw = G.qc_icon(stage, expect)
                qt = 1
                while verdict == "ERR" and qt < 4:
                    verdict, raw = G.qc_icon(stage, expect)
                    qt += 1
                print("   verdict=%s  raw=%s" % (verdict, raw[:100]), flush=True)
                if verdict == "PASS":
                    break
            passed = (verdict == "PASS")
            deploy = os.path.join(G.DEPLOY_DIR, "item_%s.png" % wid)
            if passed and os.path.exists(stage):
                shutil.copyfile(stage, deploy)
                print("   DEPLOYED -> %s" % deploy, flush=True)
        except Exception:
            traceback.print_exc()
            passed = False
            verdict = "ERR"
            raw = "EXCEPTION"
        results[wid] = {"name": cname, "status": "PASS" if passed else "FAIL",
                        "tries": tries, "verdict": verdict, "raw": raw}
        # 每项后落盘增量结果
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
    np = sum(1 for v in results.values() if v["status"] == "PASS")
    print("\nPASS2 done: PASS=%d/%d -> %s" % (np, len(FIX), OUT_JSON), flush=True)


if __name__ == "__main__":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
