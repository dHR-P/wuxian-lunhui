# -*- coding: utf-8 -*-
"""biosFinal_qc_hunter_cut.py — hunter cut FINAL3 视觉质检(glm-5.3-flash)。
判据: 主体肌肉块面完整、左胸/腋下/肩部无镂空/缺失、臂-躯空隙应透明为背景、
边缘无白/黑描边、无离体碎点。透明黑处为背景, 非主体缺失。32px 可辨识。
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


def qc(path, retries=6):
    key = get_key()
    du = to_data_url(path)
    user_msg = (
        "这是游戏猎杀者(hunter: 无皮肤肌肉怪兽, 灰棕肌肉块面, 左巨爪右刀骨刃, 低重心扑击姿态)的"
        "【抠图图】。背景为透明(RGBA), 查看器可能显示为白/灰棋盘或白底, 这不算缺陷。"
        "请按以下判据逐条核实:\n"
        "1) 主体肌肉块面是否完整? 左胸(pectoral/胸部左)、腋下、肩部、两臂、躯干、腿、爪、刀 是否都完整、"
        "  无明显镂空/缺失/断裂?\n"
        "2) 左臂与躯干之间的空隙: 应表现为『透明背景缝隙』将左臂与躯干干净分隔; 是否如此? 该空隙的边界是否"
        "  干净, 有没有把左胸或腋下肌肉块面打穿吃掉?\n"
        "3) 边缘是否干净: 有无白/浅色描边、光晕、黑边残留、离体碎点、锯齿?\n"
        "4) 缩放到 32px 小尺寸, 该剪影是否仍可辨识为『肌肉怪物(无皮肤、有爪/刀)』?\n"
        "只输出 JSON: {\"pass\":bool,\"verdict\":\"PASS|FAIL\",\"scores\":{\"object\":0-1,"
        "\"chest_integrity\":0-1,\"edge\":0-1,\"silhouette\":0-1},\"defects\":[\"...\"]}\n"
        "并在 JSON 后另起一行给出「左胸完整性数值(0-1)」与「32px 是否可接受」的明确结论。"
    )
    body = {
        "model": "glm-5.3-flash",
        "messages": [
            {"role": "system", "content": "你是严格的游戏抠图素材质检员, 只按判据客观判 PASS/FAIL, 透明黑/白棋盘背景属正常不算缺陷。"},
            {"role": "user", "content": [
                {"type": "text", "text": user_msg},
                {"type": "image_url", "image_url": {"url": du}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = resp["choices"][0]["message"]
            content = msg.get("content") or ""
            if not content and msg.get("reasoning_content"):
                content = msg["reasoning_content"]
            print("=== RAW ===", flush=True)
            print(content, flush=True)
            m = re.search(r"\{.*\}", content, re.DOTALL)
            return (m.group(0) if m else content), content
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d" % (attempt, code), flush=True)
            if code in (429, 503, 400):
                time.sleep(15); continue
            if attempt >= retries:
                return None, "QC_ERROR: HTTP %d" % code
            time.sleep(8)
        except Exception as e:
            print("attempt %d err: %s" % (attempt, e), flush=True)
            if attempt >= retries:
                return None, "QC_ERROR: %s" % e
            time.sleep(8)
    return None, "QC_ERROR"


if __name__ == "__main__":
    js, raw = qc(sys.argv[1])
    print("\n=== RESULT ===", flush=True)
    print(json.dumps({"file": os.path.basename(sys.argv[1]), "json": js, "raw": raw}, ensure_ascii=False), flush=True)
    sys.exit(0)