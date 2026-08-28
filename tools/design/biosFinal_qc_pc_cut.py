# -*- coding: utf-8 -*-
"""biosFinal_qc_pc_cut.py — pc_wan6_cut 抠图终审(glm-5.3-flash)。
判据: 背景透明(查看器白底/棋盘正常非缺陷)、主体完整、头顶黑发完整保留无镂空、
发丝与背景分离、无白/黑描边、无碎点。32px 黑发辨识度。
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
    setting = ("健康亚洲青年男性战士(主角郑吒): 黑色短发、深灰蓝紧身T恤+深色战术长裤+战术腰带、"
               "站立握拳、非丧尸非变异。")
    user_msg = (
        "这是游戏主角「郑吒」的【抠图图】(背景透明 RGBA, 查看器显示白/灰棋盘或白底属正常, 不算缺陷)。"
        "历史问题是上一版 cutout 头顶黑发被误抠成空洞/发白, 现按如下判据终审本版:\n"
        "1) 黑色短发(头顶发区)是否完整保留? 头顶是否有大块镂空/空洞/发白/被削平? 发顶轮廓是否完整、可辨为黑发造型?\n"
        "2) 发丝/发簇与透明背景的边界是否清晰、无发丝上残留白边或把头发吃光?\n"
        "3) 主体(头到鞋底)是否完整、是否居中? 有无断肢/离体碎点/白描边/黑边残留?\n"
        "4) 缩放到 32px 小尺寸, 该剪影是否仍保留郑吒的黑色短发+深灰T恤+站立形象的可辨识度?\n"
        "只输出 JSON: {\"pass\":bool,\"verdict\":\"PASS|FAIL\",\"scores\":{\"complete\":0-1,"
        "\"hair\":0-1,\"edge\":0-1,\"silhouette\":0-1},\"defects\":[\"...\"]}\n"
        "并在 JSON 后另起一行给出「头顶黑发有无镂空风险(0-1,越大越完整)」与「32px 是否可接受」的明确结论。"
    )
    body = {
        "model": "glm-5.3-flash",
        "messages": [
            {"role": "system", "content": "你是严格的游戏扣图素材质检员, 只按判据客观判 PASS/FAIL, 透明/白棋盘背景正常不算缺陷。"},
            {"role": "user", "content": [
                {"type": "text", "text": "【正式设定】\n" + setting + "\n\n" + user_msg},
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