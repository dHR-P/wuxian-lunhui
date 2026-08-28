# -*- coding: utf-8 -*-
"""biosFinal_hunter_locate_void.py — 让 glm 在 hunter raw 上精确标出「左臂与躯干间被纯黑背景填满的凹槽/空隙」的像素 bbox。
用于 FINAL3 受限局部手术的 bbox 范围。输出约化(768x1024)坐标。
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


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    return re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', t).group(1).strip()


def to_data_url(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def locate(path, retries=5):
    key = get_key()
    du = to_data_url(path)
    user_msg = (
        "这张是 768x1024 的立绘原图(猎杀者 hunter: 无皮肤肌肉怪兽, 灰棕肌肉块面, 左巨爪右刀骨刃, "
        "低重心扑击姿态), 背景为纯黑。"
        "请找到并精确给出「左臂(画面左/主角左侧)与躯干(胸/肋)之间的凹槽空隙」的位置——这是被纯黑背景填满的缝隙区,"
        "物理上不属于肌肉本体, 是手臂抬起与躯干之间形成的封闭背景空隙。"
        "请:a) 有无这个空隙? b) 给出紧贴它四周的最小像素 bbox(左 xl、右 xr、上 yt、下 yb, 0-767 × 0-1023),"
        "范围要尽量小只包住空隙本身、不要放进左胸或腋下肌肉。c) 空隙大致形状(长条/三角)与占据画面哪个方位。"
        "如果手臂与躯干间没有明显的背景空隙(贴在一起), 请直接说 bbox=none。"
        "只输出 JSON: {\"exists\":bool,\"bbox\":[xl,yt,xr,yb],\"note\":\"一条简短描述\"}"
    )
    body = {
        "model": "glm-5.3-flash",
        "messages": [
            {"role": "system", "content": "你只按像素客观标注 bbox, 不臆造, 不给出模糊范围。"},
            {"role": "user", "content": [
                {"type": "text", "text": user_msg},
                {"type": "image_url", "image_url": {"url": du}},
            ]},
        ],
        "max_tokens": 1000,
        "temperature": 0.1,
    }
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = resp["choices"][0]["message"]
            content = msg.get("content") or msg.get("reasoning_content") or ""
            print(content, flush=True)
            m = re.search(r"\{.*\}", content, re.DOTALL)
            return m.group(0) if m else content
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d" % (attempt, code), flush=True)
            if code in (429, 503, 400):
                time.sleep(15); continue
            if attempt >= retries:
                return None
            time.sleep(8)
        except Exception as e:
            print("attempt %d err: %s" % (attempt, e), flush=True)
            if attempt >= retries:
                return None
            time.sleep(8)
    return None


if __name__ == "__main__":
    js = locate(sys.argv[1])
    print("\n=== RESULT ===", flush=True)
    print(js, flush=True)
    sys.exit(0)