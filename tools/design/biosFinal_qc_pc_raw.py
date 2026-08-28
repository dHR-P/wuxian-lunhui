# -*- coding: utf-8 -*-
"""biosFinal_qc_pc_raw.py — pc_wan6 raw 视觉质检(glm-5.3-flash)。
判据(显式写入 prompt):纯黑背景且无暗角/渐变灰边、单人全身入画、头顶完整不出框、
发丝轮廓与背景分离清晰、人物符合郑吒设定。注明:后续抠图会移除的黑边透明区不算缺陷。
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
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def qc_raw(path, retries=5):
    key = get_key()
    data_url = to_data_url(path)
    setting = (
        "健康亚洲青年男性战士(主角郑吒): 金色不确定——应为 黑色短发、深灰蓝紧身T恤、深色战术长裤、"
        "战术腰带、双臂自然下垂握拳、笔直站立全身像, 非丧尸非变异。"
    )
    user_msg = (
        "请质检这张【纯黑背景原图】(768x1024) 的全身立绘 raw。按以下显式判据逐条核实并给结论:\n"
        "1) 背景: 是否为绝对平面纯黑 #000000? 画面四周(尤其四角与底边)是否绝无暗角/vignette/渐变灰边/地面反光/光晕/白描边?\n"
        "2) 主体: 是否单人、全身(头发顶到鞋底)完整入画? 是否居中?\n"
        "3) 头顶: 头顶/发顶是否完整覆盖、完整不出框、未被画面上缘裁切? 头顶上方是否仍有纯黑留白余量?\n"
        "4) 发丝: 头发发丝/发簇与纯黑背景的边界是否清晰分离、可辨(而非头发与背景同为漆黑难分)? 头顶发区是否有大块镂空/空洞/发白?\n"
        "5) 人物: 是否符合郑吒设定(黑色短发、深灰蓝T恤、深色长裤、战术腰带、站立握拳、健康人类战士、非丧尸非变异)?\n"
        "注意: 这是抠图前 raw, 后续抠图会移除的黑边透明区/最外侧深色过渡不算缺陷; 请只针对上述判据判 PASS/FAIL。\n"
        "只输出 JSON: {\"pass\":bool,\"verdict\":\"PASS|FAIL\",\"scores\":{\"background\":0-1,\"complete\":0-1,"
        "\"head\":0-1,\"hair_sep\":0-1,\"object\":0-1},\"defects\":[\"...\"]}\n"
        "并在 JSON 后另起一行给出「头顶黑发是否可被下一步 flood 抠图保留、是否会有头顶镂空风险」的明确结论。"
    )
    body = {
        "model": "glm-5.3-flash",
        "messages": [
            {"role": "system", "content": "你是严格的游戏立绘视觉质检员, 只按给定判据客观判 PASS/FAIL, 不臆造细节。"},
            {"role": "user", "content": [
                {"type": "text", "text": "【正式设定】\n" + setting + "\n\n" + user_msg},
                {"type": "image_url", "image_url": {"url": data_url}},
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
            print("attempt %d HTTP %d: %s" % (attempt, code, e.read().decode(errors="replace")[:200]), flush=True)
            if code in (429, 503, 400):
                time.sleep(15)
                continue
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
    img = sys.argv[1]
    js, raw = qc_raw(img)
    print("\n=== RESULT ===", flush=True)
    print(json.dumps({"file": os.path.basename(img), "json": js, "raw": raw}, ensure_ascii=False), flush=True)
    sys.exit(0)