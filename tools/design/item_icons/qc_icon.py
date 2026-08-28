# -*- coding: utf-8 -*-
"""qc_icon.py — 质检道具图标（纯黑底 / 无文字水印 / 图标清晰可辨）。
用法: qc_icon.py <img.png> "<道具中文名/期望内容>"
模型: qwen3.7-flash（tokenrhythm 无前缀），图片以 data URL base64 传入。
返回: PASS / FAIL，附简要理由。
"""
import base64
import json
import os
import re
import sys
import time
import urllib.request

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "qwen3.7-flash"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def img_data_url(path):
    mime = "image/png"
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return "data:%s;base64,%s" % (mime, b64)


def qc(path, expect, model=MODEL, retries=5):
    key = get_key()
    sys_prompt = (
        "你是道具图标质检员。判断这张图标图是否合格："
        "1) 背景是否为纯正黑色（图标主体之外的底应为漆黑、无明显异色/灰色渐变背景或画面); "
        "2) 是否无任何文字、字母、数字、水印、logo、版权标识；"
        "3) 图标主体是否清晰可辨、居中、边缘干净、符合\"%s\"这一道具的视觉预期。"
        "直接输出严格 JSON，格式必须为：{\"verdict\":\"PASS 或 FAIL\",\"issues\":\"具体问题，无则空串\",\"brief\":\"一句说明\"}。"
        "除该 JSON 外不要输出任何其他字符、解释或推理。"
        % expect
    )
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": "请质检这张道具图标（期望内容：%s）。" % expect},
                {"type": "image_url", "image_url": {"url": img_data_url(path)}},
            ]},
        ],
        "max_tokens": 2500,
    }
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                URL, data=json.dumps(body).encode(),
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read().decode())
            content = resp["choices"][0]["message"]
            txt = content.get("content") or content.get("reasoning_content") or ""
            # 兼容：模型可能把 reasoning 放 content、答案放 reasoning_content；两段都收
            rtxt = content.get("reasoning_content") or ""
            if txt and txt.strip():
                return txt.strip() + ("\n[RC]" + rtxt.strip() if rtxt.strip() and rtxt.strip() != txt.strip() else "")
            return "ERR: empty"
        except urllib.error.HTTPError as e:
            code = e.code
            detail = e.read().decode(errors="replace")[:300]
            print("attempt %d HTTP %d: %s" % (attempt, code, detail), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if attempt >= retries:
                return "ERR: HTTP %d" % code
            time.sleep(5)
        except Exception as e:
            print("attempt %d err: %s" % (attempt, e), flush=True)
            if attempt >= retries:
                return "ERR: %s" % e
            time.sleep(5)
    return "ERR"


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    path = sys.argv[1]
    expect = sys.argv[2] if len(sys.argv) > 2 else ""
    out = qc(path, expect)
    # 从全文中提取 verdict：找所有含 verdict 的 JSON 对象，取最后一个
    verdict = "PASS"
    for m in re.finditer(r'\{[^{}]*"verdict"[^{}]*\}', out, re.DOTALL):
        try:
            j = json.loads(m.group(0))
            if "verdict" in j:
                verdict = j["verdict"].strip().upper()
        except Exception:
            pass
    print("QC_VERDICT:", verdict, flush=True)
    print("QC_RAW:", out, flush=True)

