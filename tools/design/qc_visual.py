# -*- coding: utf-8 -*-
"""qc_visual.py — 用 tokenrhythm/qwen3.7-flash 对图片做视觉质检。
用法:
  python qc_visual.py <image_path> "<qc_prompt>"
端点: POST https://tokenrhythm.studio/v1/chat/completions (OpenAI 兼容)
模型: qwen3.7-flash (不带 tokenrhythm/ 前缀)
传图: data URL base64, max_tokens 4000
429 退避: 15s x 5
输出: 打印模型返回全文
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
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def img_to_data_url(path, mime="image/png"):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{b64}"


def qc(image_path: str, qc_prompt: str, retries: int = 5):
    key = get_key()
    data_url = img_to_data_url(image_path)
    # 注意: data URL 很长, 用文本拼接注入 message
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": qc_prompt},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]}
    ]
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "max_tokens": 4000,
    }).encode()
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            text = resp["choices"][0]["message"]["content"]
            print("===QC_OUTPUT===")
            print(text)
            print("===END===")
            return True
        except urllib.error.HTTPError as e:
            code = e.code
            detail = e.read().decode(errors="replace")[:400]
            print("attempt %d HTTP %d: %s" % (attempt, code, detail), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if attempt >= retries:
                return False
            time.sleep(5)
        except Exception as e:
            print("attempt %d err: %s" % (attempt, e), flush=True)
            if attempt >= retries:
                return False
            time.sleep(5)
    return False


if __name__ == "__main__":
    image_path = sys.argv[1]
    qc_prompt = sys.argv[2]
    ok = qc(image_path, qc_prompt)
    print("RESULT: %s" % ("OK" if ok else "FAIL"), flush=True)
    sys.exit(0 if ok else 1)