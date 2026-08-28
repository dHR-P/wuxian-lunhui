# -*- coding: utf-8 -*-
"""Visual quality eval via Ollama gemma4:e4b multimodal (per rules/short-drama.md).
Usage: python eval_visual.py <img1> [<img2> ...]
Verdict per image: PASS if overall>=6 and artifact_level>=5.
"""
import base64, json, re, sys, urllib.request

MODEL = "gemma3:4b"  # gemma4:e4b 当前构建不支持图像输入，实测 gemma3:4b 多模态可用
BASE = "http://127.0.0.1:11434"

PROMPT = (
    "你是AI生成图像质检员。对这张图按以下维度打分(1-10整数)："
    "overall(总体质量), subject_consistency(主体完整一致), prompt_alignment(与描述契合), "
    "artifact_level(伪影/畸形程度，分越高伪影越少)。"
    "只输出JSON：{\"overall\":n,\"subject_consistency\":n,\"prompt_alignment\":n,\"artifact_level\":n,\"reason\":\"一句话中文\"}"
)


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def eval_img(path):
    payload = {"model": MODEL, "prompt": PROMPT, "images": [b64(path)], "stream": False,
               "options": {"temperature": 0.1}}
    req = urllib.request.Request(BASE + "/api/generate",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req, timeout=300).read())
    text = resp.get("response", "")
    m = re.search(r"\{[^{}]*\}", text, re.S)
    if not m:
        return {"file": path, "error": "no-json:" + text[:120]}
    d = json.loads(m.group(0))
    d["file"] = path
    d["pass"] = d.get("overall", 0) >= 6 and d.get("artifact_level", 0) >= 5
    return d


if __name__ == "__main__":
    # ensure server up
    try:
        urllib.request.urlopen(BASE + "/api/tags", timeout=5)
    except Exception:
        print("OLLAMA DOWN - start 'ollama serve' first", flush=True)
        sys.exit(3)
    results = [eval_img(p) for p in sys.argv[1:]]
    print(json.dumps(results, ensure_ascii=False, indent=1))
