# -*- coding: utf-8 -*-
"""probe_wan_image_input.py — 探测 tokenrhythm wan2.7-image 端点是否支持参考图(reference image)输入。
仅做一次最小探测调用;若端点拒绝 image 字段则打印错误,确认只能用纯 prompt 生成。
"""
import base64, json, os, re, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/images/generations"

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""

def probe():
    key = get_key()
    # 用一个极小的 1x1 黑底 base64 作 reference 输入
    tiny = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    body = json.dumps({
        "model": "wan2.7-image",
        "prompt": "test probe",
        "n": 1,
        "size": "768x1024",
        "image": "data:image/png;base64," + tiny,
    }).encode()
    try:
        req = urllib.request.Request(URL, data=body, headers={
            "Authorization": "Bearer " + key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read().decode())
        print("IMAGE_INPUT_OK:", resp)
        return True
    except urllib.error.HTTPError as e:
        print("HTTP %d: %s" % (e.code, e.read().decode(errors="replace")[:400]))
        return False
    except Exception as ex:
        print("EXC:", ex)
        return False

if __name__ == "__main__":
    probe()