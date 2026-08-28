#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Qwen3.7-flash 视觉质检运行器(reusable)。
用法: python qc_qwen.py <image_path> <instruction_json_file>
将图像 base64 成 data URL 传给 tokenrhythm OpenAI 兼容接口。
"""
import sys, os, json, base64, time, re, urllib.request

API_URL = "https://tokenrhythm.studio/v1/chat/completions"
CRED_FILE = r"C:\Users\GWL\.dsh\.credentials.yaml"
MODEL = "qwen3.7-flash"

def load_key():
    with open(CRED_FILE, "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*TOKENRHYTHM_API_KEY:\s*(.+)", line)
            if m:
                return m.group(1).strip()
    raise RuntimeError("TOKENRHYTHM_API_KEY not found")

def image_data_url(path):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    # 根据扩展名推断 mime
    ext = os.path.splitext(path)[1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/png")
    return f"data:{mime};base64,{b64}"

def call(payload):
    key = load_key()
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": f"Bearer {key}"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            if e.code == 429 and attempt < 5:
                wait = 15 * (attempt + 1)
                sys.stderr.write(f"[429] retry in {wait}s\n")
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {e.code}: {body}")
        except Exception as e:
            if attempt < 5:
                sys.stderr.write(f"[err] {e} retry {attempt+1}\n")
                time.sleep(10)
                continue
            raise

def main():
    image_path = sys.argv[1]
    inst_path = sys.argv[2]
    with open(inst_path, "r", encoding="utf-8") as f:
        inst = json.load(f)
    instruction = inst["instruction"]
    data_url = image_data_url(image_path)
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "你是素材终验专员,严格按给定判据与输出格式做视觉质检,只依据画面实际内容判断,不得猜测。使用 MoE 聚合时你看到的是视觉输入。"},
            {"role": "user", "content": [
                {"type": "text", "text": instruction},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }
    resp = call(payload)
    # 读取回复
    msg = resp["choices"][0]["message"]
    content = msg.get("content") or ""
    reasoning = msg.get("reasoning_content") or ""
    # 判断是否偶发只返回 reasoning
    out = {"image": image_path, "content": content, "reasoning": reasoning}
    # 尝试抽取 JSON
    jm = re.search(r"\{.*\}", content, re.S)
    if jm:
        try:
            out["parsed_json"] = json.loads(jm.group(0))
        except Exception:
            out["parsed_json"] = None
    result_txt = json.dumps(out, ensure_ascii=False, indent=2)
    # 同时写 UTF-8 文件防止控制台编码乱码
    res_path = os.path.splitext(image_path)[0] + ".qcresult.json"
    with open(res_path, "w", encoding="utf-8") as f:
        f.write(result_txt)
    print(result_txt)

if __name__ == "__main__":
    main()