# -*- coding: utf-8 -*-
"""regen_2.py — 针对 龙珠/恶魔 强化 prompt 重生成 + qwen 二值化质检 + 部署。"""
import base64, io, json, os, re, shutil, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_wan import gen
STAGE = os.path.join(HERE, "gear_tr_bl_stages")
DEPLOY = os.path.join(os.path.dirname(os.path.dirname(HERE)), "server-rs", "ui", "assets", "img")
CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
QC_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "qwen3.7-flash"

COMMON = (
    "A clean flat 2D game icon of a single object on a perfectly uniform pure black (#000000) "
    "background, edge to edge. Object exactly centered, about 65% of the frame, flat matte "
    "rendering with INTERIOR shading only. CRITICAL: NO rim/bright outline, NO glow, NO aura, "
    "NO halo, NO light beam, NO bloom — surroundings stay uniform solid black, no gradient, no "
    "glow, no reflection. CRITICAL: NO text, NO letters, NO numbers, NO runes, NO watermark, NO "
    "logo, NO border, NO caption. Crisp flat game icon. Item: "
)

JOBS = [
    ("tr_longzu_shengyi", "龙珠·七龙珠",
     "a single perfectly round orange dragon-ball orb, a smooth glassy translucent orange sphere "
     "with seven small red star dots clustered together inside the ball and a faint white cloud "
     "swirl within, pure round ball, no aura no glow no text"),
    ("demon_bloodline", "恶魔",
     "a demonic bloodline emblem, an angular black devil skull with two large curved horns and a "
     "small red pentagram in the center of the forehead, carved dark iron relief with interior "
     "highlight only, no glow no text no runes"),
]

def key():
    with open(CRED, "r", encoding="utf-8") as f:
        return re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', f.read()).group(1).strip()

def img_data_url(p):
    with open(p, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def extract(out):
    out = out or ""
    for m in re.finditer(r'\{[^{}]*"verdict"[^{}]*\}', out, re.DOTALL):
        try:
            j = json.loads(m.group(0))
            if j.get("verdict") == "PASS": return "PASS"
            if j.get("verdict") == "FAIL": return "FAIL"
        except Exception: pass
    if "FAIL" in out or "不通过" in out or "不合格" in out or "无文字或红色辉光" in out: return "FAIL"
    if "PASS" in out or "通过" in out or "合格" in out: return "PASS"
    if "不符合" in out or "违反" in out or "未命中" in out: return "FAIL"
    return "ERR"

def qc(p, expect):
    sys_prompt = (
        "你是游戏图标质检员, 只输出一个 JSON 对象: {\"verdict\":\"PASS 或 FAIL\",\"issues\":\"\",\"brief\":\"\"}。\n"
        "背景主体外须纯黑(明显渐变/辉光/光环/反光算 FAIL); 无文字字母数字符文水印logo(有即 FAIL); "
        "主体居中清晰符合期望(是则 PASS, 残缺畸形算 FAIL); 主体轮廓外无完整描边/外发光环。"
    )
    body = {"model": QC_MODEL, "messages": [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": [
            {"type": "text", "text": "期望: %s。质检这张图标。" % expect},
            {"type": "image_url", "image_url": {"url": img_data_url(p)}},
        ]}], "max_tokens": 500, "temperature": 0.0}
    for _ in range(8):
        try:
            req = urllib.request.Request(QC_URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key(), "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read().decode())
            c = resp["choices"][0]["message"]
            txt = (c.get("content") or c.get("reasoning_content") or "")
            v = extract(txt)
            if v in ("PASS", "FAIL"):
                return v, txt
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(15); continue
            if e.code in (500,502,503,504): time.sleep(12); continue
            return "ERR", str(e)
        except Exception as e:
            return "ERR", str(e)
    return "ERR", "nodecision"

for iid, cname, en in JOBS:
    prefix = "tr_" if iid == "tr_longzu_shengyi" else "bl_"
    out = os.path.join(DEPLOY, "%s%s.png" % (prefix, iid))
    prompt = COMMON + en
    done = False
    for t in range(1, 4):
        sp = os.path.join(STAGE, "regen2_%s%s.png" % (prefix, iid))
        print("[%s] gen attempt %d..." % (iid, t), flush=True)
        if not gen(prompt, "768x768", sp):
            continue
        v, raw = qc(sp, cname)
        print("  QC=%s raw=%s" % (v, raw[:100]), flush=True)
        if v == "PASS":
            shutil.copyfile(sp, out)
            print("  DEPLOYED -> %s" % out, flush=True)
            done = True
            break
    print("RESULT %s for %s" % ("PASS" if done else "FAIL", iid), flush=True)
