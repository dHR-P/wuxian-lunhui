# -*- coding: utf-8 -*-
"""gen_weapon_icons_40_pass3.py — 第三轮: 针对 pass2 仍 FAIL 的 4 个武器(斩魄刀卍解/太极图/青云飞剑/等离子刺刃)
做最激进修正: 强调单剑/无圆环边框/光完全封闭在刃内。复用 G 的 gen/qc_icon。
输出: tools/design/item_icons/weapon_pass3_results.json
"""
import io
import json
import os
import shutil
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_weapon_icons_40 as G  # noqa

STAGE3 = os.path.join(HERE, "item_icons", "weapon_pass3_stages")
os.makedirs(STAGE3, exist_ok=True)
OUT_JSON = os.path.join(HERE, "item_icons", "weapon_pass3_results.json")

# 每项: weapon_id -> (中文名, 新描述)
FIX3 = {
    "wp_zanjingdao_he": (
        "斩魄刀·卍解",
        "EXACTLY ONE single Japanese katana, no pair, no twin, no crossed blades, no scabbard. "
        "A slim all-black zanpakutō sword with a gently curved single blade, black silk-wrapped "
        "handle and a small round tsuba. Matte dark finish, the blade is one continuous clean "
        "edge, no glow, no aura, no text. Just one solitary sword standing centered."
    ),
    "wp_taiji_tu": (
        "太极图",
        "a FLAT clean black-and-white yin-yang (taiji) emblem as a 2D graphic mark ONLY, "
        "exactly a circle disc split into one black and one white swirl each with a dot. "
        "NO border, NO metallic ring, NO outer frame, NO ring around the disc, NO glow, NO "
        "halo, NO depth, NO metal texture. The disc floats alone on the black background, "
        "plain flat 2D logos, edge crisp. Absolutely no trigram ring, no text, no ring."
    ),
    "wp_feijian_qingyun": (
        "青云飞剑",
        "EXACTLY ONE single straight levitating Chinese flying sword, one blade only, no pair, "
        "no twin, no crossed, no second sword. A vertical cyan-tinted metal jian with a dark "
        "guard and wrapped hilt, plain and static. Flat matte metal, NO glow, NO qi trail, NO "
        "aura, NO light halo around it, no text. Just one single sword."
    ),
    "wp_plasma_dagger": (
        "等离子刺刃",
        "a short sci-fi combat dagger, dark solid metal hilt and a SINGLE magenta energy blade "
        "drawn as one clean solid flat translucent bar of uniform magenta color. The magenta is "
        "a solid blade surface, absolutely NO glow, NO halo, NO bloom, NO light spilling into "
        "the black, edges hard and crisp, flat 2D, no flare."
    ),
}


def main():
    results = {}
    if os.path.exists(OUT_JSON):
        try:
            with open(OUT_JSON, "r", encoding="utf-8") as f:
                results = json.load(f)
        except Exception:
            results = {}
    todo = {}
    for wid, (cname, desc) in FIX3.items():
        deploy = os.path.join(G.DEPLOY_DIR, "item_%s.png" % wid)
        if results.get(wid, {}).get("status") == "PASS" and os.path.exists(deploy):
            print("skip %s" % wid, flush=True)
            continue
        todo[wid] = (cname, desc)

    for wid, (cname, desc) in todo.items():
        stage = os.path.join(STAGE3, wid + ".png")
        prompt = G.COMMON + desc
        expect = "%s（%s）" % (cname, wid)
        print("\n[PASS3] %s %s ..." % (wid, cname), flush=True)
        verdict, raw, tries, passed = "FAIL", "", 0, False
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
                print("   verdict=%s raw=%s" % (verdict, raw[:100]), flush=True)
                if verdict == "PASS":
                    break
            passed = (verdict == "PASS")
            deploy = os.path.join(G.DEPLOY_DIR, "item_%s.png" % wid)
            if passed and os.path.exists(stage):
                shutil.copyfile(stage, deploy)
                print("   DEPLOYED -> %s" % deploy, flush=True)
        except Exception:
            traceback.print_exc()
            passed, verdict, raw = False, "ERR", "EXCEPTION"
        results[wid] = {"name": cname, "status": "PASS" if passed else "FAIL",
                        "tries": tries, "verdict": verdict, "raw": raw}
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
    np = sum(1 for v in results.values() if v["status"] == "PASS")
    print("\nPASS3 done: PASS=%d/%d" % (np, len(FIX3)), flush=True)


if __name__ == "__main__":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
