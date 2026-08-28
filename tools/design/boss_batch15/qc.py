# -*- coding: utf-8 -*-
"""qc.py — 用 qwen3.7-flash 视觉质检单张立绘(纯黑底生成图/抠图)。
用法: python qc.py <image.png> <stage: raw|cut>
输出 JSON {ok:bool, score:int, issues:[...], note:str}
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MB = 1.2 * 1024 * 1024

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', t)
    return m.group(1).strip() if m else ""

def downsample_to_b64(path, max_bytes=MB):
    """读取图片;若体积过大,逐级缩小到 <=max_bytes 后转 dataURL。"""
    from PIL import Image
    import io
    with open(path, "rb") as f:
        data = f.read()
    scale = 1.0
    orig = len(data)
    img = None
    if len(data) > max_bytes:
        img = Image.open(path).convert("RGB")
        while len(data) > max_bytes:
            scale *= 0.6
            w = max(64, int(img.width * scale)); h = max(64, int(img.height * scale))
            im2 = img.resize((w, h), Image.LANCZOS)
            buf = io.BytesIO(); im2.save(buf, "JPEG", quality=82)
            data = buf.getvalue()
    return "data:image/jpeg;base64," + base64.b64encode(data).decode(), len(data) <= max_bytes

def qc(path, stage, retries=5):
    key = get_key()
    b64, fully = downsample_to_b64(path)
    stage_note = ("未抠图原始黑底生成图" if stage == "raw" else "抠图后的透明PNG")
    sys_prompt = (
        "你是立绘质检专员。检查一张%s。检查要点：(1)主体是否完整、是否全身、是否清晰可辨识，"
        "是否符合该怪物的标志性特征；(2)若是原始图:纯黑色背景是否纯净、主体边缘是否有白色光晕/"
        "白色描边/白色外发光/白雾溢出——有白晕则为严重问题赋值很低分；(3)若是抠图图:主体内部是否镂空穿洞、"
        "边缘是否毛糙残缺、主体是否只剩残缺残肢。先简明一句话给出结论诊断，然后**最后单独一行**输出纯JSON"
        " {\"ok\":true/false,\"score\":0-100,\"issues\":[\"具体问题\"],\"note\":\"结论\"}，"
        "不得在JSON后再加任何文字。" % stage_note)
    body = json.dumps({
        "model": "qwen3.7-flash",
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": "请质检该%s立绘。" % stage_note},
                {"type": "image_url", "image_url": {"url": b64}},
            ]},
        ],
        "max_tokens": 4000,
    }).encode()
    for at in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            content = resp["choices"][0]["message"]["content"]
            # 兼容 reasoning_content 字段
            if not content:
                content = resp["choices"][0]["message"].get("reasoning_content") or ""
            # 提取最后一个完整 JSON 块(可能前面/后面有分析文字)
            cands = re.findall(r'\{[^{}]*\}', content, re.S)
            parsed = None
            for c in reversed(cands):
                try:
                    v = json.loads(c)
                    if isinstance(v, dict) and "ok" in v and "score" in v:
                        parsed = v
                        break
                except Exception:
                    continue
            if parsed is not None:
                return parsed
            return {"ok": False, "score": 0, "issues": ["质检回复非JSON:%s" % content[:180]], "note": ""}
        except urllib.error.HTTPError as e:
            code = e.code
            print("qc attempt %d HTTP %d: %s" % (at, code, e.read().decode(errors="replace")[:200]), flush=True)
            if code == 429:
                wait = 15 + at * 5
                print("  rate-limited, sleep %ds" % wait, flush=True)
                time.sleep(wait)
                continue
            if at >= retries: return {"ok": False, "issues": ["QC HTTP %d" % code]}
            time.sleep(5)
        except Exception as e:
            print("qc attempt %d err: %s" % (at, e), flush=True)
            if at >= retries: return {"ok": False, "issues": ["QC err %s" % e]}
            time.sleep(5)
    return {"ok": False, "issues": ["QC exhausted"]}

if __name__ == "__main__":
    path = sys.argv[1]
    stage = sys.argv[2] if len(sys.argv) > 2 else "raw"
    print(json.dumps(qc(path, stage), ensure_ascii=False))
