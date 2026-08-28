# -*- coding: utf-8 -*-
"""gen_gear_tr_bl_retry.py — 针对首轮 FAIL 的 3 个图标重生成并质检部署 (强化 prompt 根因修复)。
FAIL 清单: 龙珠(verbose QCDR), 赛亚人(外发光污染), 恶魔(符文文字/红辉光)。
"""
import base64, io, json, os, re, shutil, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_wan import gen

STAGE_DIR = os.path.join(HERE, "gear_tr_bl_stages")
os.makedirs(STAGE_DIR, exist_ok=True)
DEPLOY_DIR = os.path.join(os.path.dirname(os.path.dirname(HERE)), "server-rs", "ui", "assets", "img")

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
QC_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "qwen3.7-flash"
MAX_RETRY = 3

COMMON = (
    "A clean flat 2D game icon of a single object rendered on a perfectly uniform pure black "
    "(#000000) background, edge to edge. The object sits exactly centered occupying about "
    "65% of the square frame. Flat matte stylized rendering with even ambient lighting; all "
    "modeling uses INTERIOR shading and texture only. "
    "CRITICAL — NO RIM LIGHT: NO bright white outline, NO white rim, NO glowing edge, NO "
    "backlight along the contour; the object edge fades into plain dark against the black. "
    "CRITICAL — NO GLOW/BLOOM/AURA: the object emits NO glow, NO halo, NO light beam, NO aura, "
    "NO bloom, NO halo around it; the surrounding area stays absolutely uniform solid black, "
    "no gradient, no red/blue/white glow, no reflection. "
    "CRITICAL — NO TEXT OR LETTERS: absolutely no letters, no characters, no runes, no "
    "alphabet, no numbers, no watermark, no logo, no caption, no border, no ring of writing. "
    "Crisp flat game icon, straight-on front view. Item content: "
)

RETRIES = [
    ("tr", "tr_longzu_shengyi", "龙珠·七龙珠",
     "a single translucent ball of glowing-orange floating energy, a perfectly round orange dragon-ball "
     "orb with three faint red star marks inside and a small swirling white dragon-cloud pattern within "
     "the translucent sphere, smooth glassy orange orb centered, no aura outside the ball"),
    ("bl", "saiyan_bloodline", "赛亚人",
     "a fierce spiky black-silhouette head emblem, the jagged silhouette of spiked hair and a fierce "
     "glaring eye, flat dark metal relief with interior highlight only, restrained gray-and-red emblem, "
     "no aura no glow"),
    ("bl", "demon_bloodline", "恶魔",
     "a pair of curved black devil horns framing a small crimson five-pointed star emblem in the middle, "
     "carved dark stone relief, clean simple demon horns crest, matte finish, no glow, no writing"),
]

def get_qc_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip()

def img_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def extract_verdict(out):
    out = out or ""
    candidates = []
    for m in re.finditer(r'\{[^{}]*"verdict"[^{}]*\}', out, re.DOTALL):
        try:
            j = json.loads(m.group(0))
            if "verdict" in j:
                candidates.append(str(j["verdict"]).strip().upper())
        except Exception:
            pass
    if candidates:
        v = candidates[-1]
        if v == "PASS":
            return "PASS"
        if v == "FAIL":
            return "FAIL"
    if "FAIL" in out or "不通过" in out or "不合格" in out:
        return "FAIL"
    if "PASS" in out or "通过" in out or "合格" in out:
        return "PASS"
    return "ERR"

def qc_icon(path, expect):
    key = get_qc_key()
    sys_prompt = (
        "你是游戏图标质检员。下面给出图标图与期望内容。请只输出一个 JSON 对象(不要输出任何解释、推理、代码块或 markdown 标记)。\n"
        "判定口径:\n1) 背景主体外底色应整体为黑色, 出现明显灰/蓝/红渐变、雾、辉光、光环、地板反光即 FAIL。\n"
        "2) 无任何文字/字母/数字/符文/水印/logo/边框, 出现即 FAIL。\n"
        "3) 主体清晰可辨、居中、符合期望、无残缺/畸形/截断, 命中为 PASS 前提。\n"
        "4) 主体轮廓外完整的白色/彩色描边或外发光环判 FAIL (材质内部高光不算)。\n"
        "只输出: {\"verdict\":\"PASS 或 FAIL\",\"issues\":\"...\",\"brief\":\"...\"}"
    )
    user_msg = "请质检这张图标(期望内容：%s)。" % expect
    body = {
        "model": QC_MODEL,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": user_msg},
                {"type": "image_url", "image_url": {"url": img_data_url(path)}},
            ]},
        ],
        "max_tokens": 2500,
        "temperature": 0.0,
    }
    out = ""
    for attempt in range(1, 8):
        try:
            req = urllib.request.Request(QC_URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read().decode())
            c = resp["choices"][0]["message"]
            out = c.get("content") or c.get("reasoning_content") or ""
            v = extract_verdict(out)
            if v != "ERR":  # 拿到明确 PASS/FAIL 才返回
                return v, out
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(15); continue
            if e.code in (500,502,503,504):
                time.sleep(12); continue
            out = "ERR: HTTP %d" % e.code; break
        except Exception as e:
            out = "ERR: %s" % e; break
    return extract_verdict(out), out

def main():
    print("RETRY 3 FAIL ITEMS", flush=True)
    for kind, iid, cname, en in RETRIES:
        prefix = "tr_" if kind == "tr" else "bl_"
        out_name = "%s%s.png" % (prefix, iid)
        deploy = os.path.join(DEPLOY_DIR, out_name)
        expect = "%s（%s）" % (cname, iid)
        prompt = COMMON + en
        ok_flag = False
        for t in range(1, 1 + MAX_RETRY):
            stage = os.path.join(STAGE_DIR, "retry_%s%s.png" % (prefix, iid))
            print("  gen %s (%s) attempt %d..." % (iid, cname, t), flush=True)
            gok = gen(prompt, "768x768", stage)
            if not gok:
                continue
            v, raw = qc_icon(stage, expect)
            print("  QC=%s raw=%s" % (v, raw[:120]), flush=True)
            if v == "PASS":
                shutil.copyfile(stage, deploy)
                print("  DEPLOYED -> %s" % deploy, flush=True)
                ok_flag = True
                break
        print("  RESULT %s for %s" % ("PASS" if ok_flag else "FAIL", iid), flush=True)

if __name__ == "__main__":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
