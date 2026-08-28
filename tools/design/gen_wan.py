# -*- coding: utf-8 -*-
"""gen_wan.py — 通过 tokenrhythm API 用 wan2.7-image 生成图片(替代本地 Z-Image)。
用法:
  python gen_wan.py <out.png> "<prompt>" [size=768x1024]
端点: POST https://tokenrhythm.studio/v1/images/generations
模型: wan2.7-image
输出: 返回 url → 下载到 <out.png>
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
URL = "https://tokenrhythm.studio/v1/images/generations"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def gen(prompt: str, size: str = "768x1024", out: str = "out.png", retries: int = 5):
    key = get_key()
    body = json.dumps({"model": "wan2.7-image", "prompt": prompt, "n": 1, "size": size}).encode()
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read().decode())
            url = resp["data"][0]["url"]
            print("GOT url len=%d" % len(url), flush=True)
            with urllib.request.urlopen(url, timeout=120) as r2:
                img = r2.read()
            with open(out, "wb") as f:
                f.write(img)
            print("SAVED %s (%d bytes) cost_cny=%s" % (out, len(img), resp.get("cost_cny")), flush=True)
            return True
        except urllib.error.HTTPError as e:
            code = e.code
            detail = e.read().decode(errors="replace")[:300]
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
    out = sys.argv[1]
    prompt = sys.argv[2]
    size = sys.argv[3] if len(sys.argv) > 3 else "768x1024"
    ok = gen(prompt, size, out)
    print("RESULT: %s" % ("OK" if ok else "FAIL"), flush=True)
    sys.exit(0 if ok else 1)