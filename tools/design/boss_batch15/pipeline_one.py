# -*- coding: utf-8 -*-
"""pipeline_one.py — 对一张 raw 完成: 质检(raw) → floodfill抠图 → 质检(cut) → 数值复核 → 部署。
用法: python pipeline_one.py <id>
输出 JSON summary
"""
import json, os, re, subprocess, sys, time

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
TOOLS = os.path.join(BASE, "tools", "design")
BATCH = os.path.join(TOOLS, "boss_batch15")
RAW = os.path.join(TOOLS, "raw_enemy")
DEPLOY = os.path.join(BASE, "server-rs", "ui", "assets", "img")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
CUT = os.path.join(BASE, "tools", "cutout_floodfill.py")
QC = os.path.join(BATCH, "qc.py")
VER = os.path.join(BATCH, "verify_cut.py")
os.environ["PYTHONIOENCODING"] = "utf-8"

def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, r.stdout, r.stderr

def to_json(txt):
    m = re.search(r'\{.*\}', txt, re.S)
    if not m:
        return {"parse": txt[:200]}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {"parse": m.group(0)[:200]}

def main():
    cid = sys.argv[1]
    raw = os.path.join(RAW, cid + ".png")
    cut_tmp = os.path.join(BATCH, "cut_tmp_%s.png" % cid)
    out = os.path.join(DEPLOY, "enemy_%s.png" % cid)
    if not os.path.exists(raw):
        print(json.dumps({"id": cid, "status": "FAIL", "stage": "no_raw", "note": "raw missing"}))
        return

    # raw QC
    rc, so, se = run([PY, QC, raw, "raw"])
    raw_qc = to_json(so or se)
    raw_ok = bool(raw_qc.get("ok", False))
    raw_score = raw_qc.get("score", -1)
    raw_note = raw_qc.get("note", "")
    raw_issues = raw_qc.get("issues", [])

    # floodfill cutout
    cut_rc, cut_so, cut_se = run([PY, CUT, raw, cut_tmp, "16",
                                  "--seal", "2", "--closing", "1", "--feather", "2",
                                  "--hole-channel", "6", "--hole-solid", "--zero-rgb"])

    # cut QC
    rc2, so2, se2 = run([PY, QC, cut_tmp, "cut"])
    cut_qc = to_json(so2 or se2)

    # numeric verify
    rc3, so3, se3 = run([PY, VER, cut_tmp])
    ver = to_json(so3 or se3)
    if isinstance(ver, dict) and "parse" in ver:
        ver = {}
    else:
        ver = ver if isinstance(ver, list) else []

    summary = {
        "id": cid,
        "raw_score": raw_score,
        "raw_ok": raw_ok,
        "raw_issues": raw_issues,
        "raw_note": raw_note,
        "cut_qc": cut_qc,
        "verify": ver,
        "cutout_ok": os.path.exists(cut_tmp),
    }

    # deploy gate: 原始QC通过(无白晕/全身) + 数值复核通过(透明RGB=0且有主体)
    ver_ok = False
    if isinstance(ver, list) and ver:
        ver_ok = ver[0].get("valid", False)
    # 硬性否决: issues 提到白晕/光晕/白边/白描边/发光外泄,无论分数都需重生成
    halo_issues = [i for i in (raw_qc.get("issues") or [])
                   if re.search(r'白晕|光晕|白边|白描边|白雾|外发光|halo|glow|white\s*outline|white\s*edge', i, re.I)]
    raw_pass = bool(raw_ok) and int(raw_score if isinstance(raw_score, int) else 0) >= 50 and not halo_issues
    if raw_pass and ver_ok:
        os.replace(cut_tmp, out)
        summary["status"] = "PASS"
        summary["deployed"] = out
        summary["note"] = "deployed"
    elif not raw_pass:
        summary["status"] = "REGEN_REQUIRED"
        summary["deployed"] = None
        summary["halo_issues"] = halo_issues
    else:
        summary["status"] = "FAIL"
        summary["deployed"] = None
    print("PIPELINE_SUMMARY: %s" % json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
