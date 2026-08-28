# -*- coding: utf-8 -*-
"""qwen_qc_hunter3.py — 用 tokenrhythm/qwen3.7-flash 对 hunter_wan3 raw + cutout 做识图质检。
对象口径声明+7项判据。429 退避 15s×5,504 重试一次。
"""
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "qwen3.7-flash"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', t)
    return m.group(1).strip() if m else ""


def data_url(path, mime="image/png"):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def ask(path, label, prompt):
    key = get_key()
    du = data_url(path)
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": du}},
        ]}],
        "max_tokens": 4000,
    }).encode()
    for attempt in range(1, 6):  # 429 退避 15s×5
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            txt = resp["choices"][0]["message"]["content"]
            print("=== %s / %s HTTP 200 ===" % (label, os.path.basename(path)))
            print(txt)
            return txt
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d %s HTTP %d" % (attempt, label, code), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if code == 504 and attempt == 1:  # 504 重试一次
                print("504 retry once", flush=True)
                time.sleep(10)
                continue
            if attempt >= 5:
                print("FAIL %s HTTP %d" % (label, code), flush=True)
                return None
            time.sleep(5)
        except Exception as ex:
            print("attempt %d %s err %s" % (attempt, label, ex), flush=True)
            if attempt >= 5:
                return None
            time.sleep(5)
    return None


OBJECT = ("对象口径声明=【无皮肤肌肉怪兽(灰棕肌肉块面、无衣物、左巨爪右刀形骨刃、"
          "低重心蓄力扑击猎杀姿态)非人类】。请勿误判成人类/穿衣物角色。")

RAW_PROMPT = (
    "请逐项严格评判下面这张 PNG 立绘(怪物全身图),输出对每一条的『是/否』与简短证据。\n"
    + OBJECT +
    "\n判据:"
    "\n1) 全身完整:头顶、左巨爪、右刀形骨刃、双脚是否都在画面内(脚掌允许被底缘轻裁切)?"
    "\n2) 背景是否绝对平面纯净黑、无反光、无地面投影、无光晕/光斑?"
    "\n3) 脚掌是否贴住画面底缘(贴底被轻裁切)?"
    "\n4) 白色描边/浅蓝描边/边缘光晕:主体边缘有无纯白或浅色描边、轮廓光/光晕抽缕残留?"
    "\n5) 左巨爪与右手刀形骨刃是否清晰、相互分离、与身体分离可辨认?"
    "\n6) 下半身(下腹/大腿/小腿/脚)是否明亮肌肉块面、无黑色剪影、与上半身同亮度?"
    "\n最后给出综合判定:『可部署』或『需重生成』,并附最主要缺陷一句。"
)

CUT_PROMPT = (
    "这是一张已经抠图去背的透明 PNG(背景已被抠成全透明)。请逐项评判,输出每条『是/否』+证据。\n"
    + OBJECT +
    "\n判据:"
    "\n1) 背景是否完全透明(除主体外全透)?"
    "\n2) 主体(灰棕无皮肤肌肉怪兽)是否完整连续、无镂空/窟窿/躯干被打穿?"
    "\n3) 主体边缘是否有白边/黑边/发灰晕边残留?"
    "\n4) 画面是否有碎点/杂点/断肢残片散落(非主体的孤立小块)?"
    "\n5) 脚掌是否贴底被轻裁切、下半身明亮?"
    "\n最后给出综合判定:『可部署』或『需重抠图』,并附最主要缺陷一句。"
)

if __name__ == "__main__":
    RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\hunter_wan3.png"
    CUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\cutout_out\hunter_wan3_cut.png"
    LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qwen_qc_hunter3_result.txt")
    results = []
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if target == "raw":
            results.append(("RAW", ask(RAW, "RAW", RAW_PROMPT)))
        elif target == "cut":
            results.append(("CUTOUT", ask(CUT, "CUTOUT", CUT_PROMPT)))
        else:
            print("unknown target")
            sys.exit(1)
    else:
        results.append(("RAW", ask(RAW, "RAW", RAW_PROMPT)))
        results.append(("CUTOUT", ask(CUT, "CUTOUT", CUT_PROMPT)))
    with open(LOG, "w", encoding="utf-8") as f:
        for label, txt in results:
            f.write("### %s ###\n" % label)
            f.write((txt or "NO_RESPONSE") + "\n\n")
    print("QC_DONE -> %s" % LOG, flush=True)