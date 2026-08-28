# -*- coding: utf-8 -*-
"""glm_qc.py — 用 glm-5.3-flash 对素材图做视觉质检。
Usage: python glm_qc.py <image.png> <kind> <expected_desc> <out_md>
kind: raw_lihui | raw_bg | cutout
Model name sent as "glm-5.3-flash" (no tokenrhythm/ prefix)."""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "glm-5.3-flash"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def b64(url):
    with open(url, "rb") as f:
        return base64.b64encode(f.read()).decode()


def call(payload):
    key = get_key()
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + key})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502, 504, 500):
                wait = 15 * (attempt + 1)
                print("   [%d] retry after %ds" % (e.code, wait), flush=True)
                time.sleep(wait)
                continue
            raise
        except Exception:
            time.sleep(10)
    raise RuntimeError("retries exhausted")


KIND_RULES = {
    "raw_lihui": (
        "1)主体与期望设定相符(形体/特征/色调/氛围); 2)背景是绝对纯平面纯黑(#000000)可抠图; "
        "3)全身完整, 占满画面高度, 脚掌贴底缘被轻微裁切; 4)无白描边光晕/角色边缘无大面积亮白辉光泄入背景; "
        "5)剪影清晰, 主体边缘无暗色碎边窟窿(利于抠图)"
    ),
    "raw_bg": (
        "1)空镜, 绝对无人物/无角色/无人形/无生物; 2)与期望场景/层主题/色调氛围相符; "
        "3)开阔的环境空间感, 构图合理; 4)无文字/无水印/无logo; 5)无明显畸变/糊图"
    ),
    "cutout": (
        "1)透明PNG, 主体轮廓完整无镂空/无吃穿躯干; 2)主体边缘无白色亮边/无残留白描边光晕; "
        "3)剪影清晰, 无大片深色阴影被误抠成洞; 4)背景区域已完全透明"
    ),
}


def main():
    img = sys.argv[1]
    kind = sys.argv[2]
    desc = sys.argv[3]
    out_md = sys.argv[4]
    rule = KIND_RULES.get(kind, KIND_RULES["raw_lihui"])
    data_url = "data:image/png;base64," + b64(img)
    text = (
        "你是剑冢禁地素材质检员, 只输出中文。下面给出一张素材图, 判断是否合格。\n"
        "期望画面描述: " + desc + "\n"
        "判据: " + rule + "\n"
        "逐项简短说明, 最后给一行明确结论: PASS(合格可进入下一步) 或 FAIL(不合格+具体原因)。"
    )
    content = [{"type": "text", "text": text},
               {"type": "image_url", "image_url": {"url": data_url}}]
    payload = {"model": MODEL,
               "messages": [{"role": "user", "content": content}],
               "max_tokens": 4000}
    resp = call(payload)
    msg = resp["choices"][0]["message"]
    out = msg.get("content")
    if not out and "reasoning_content" in msg:
        out = msg["reasoning_content"]
    out = out or "(no content)"
    os.makedirs(os.path.dirname(os.path.abspath(out_md)) or ".", exist_ok=True)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write(out)
    try:
        sys.stdout.buffer.write(("=== QC: " + img + " ===\n").encode("utf-8"))
        sys.stdout.buffer.write(out.encode("utf-8"))
        sys.stdout.buffer.write(b"\n")
    except Exception:
        pass
    verdict = "PASS" if "FAIL" not in out[-40:] and "PASS" in out else "FAIL"
    try:
        sys.stdout.buffer.write(("VERDICT: " + verdict + "\n").encode("utf-8"))
    except Exception:
        pass


if __name__ == "__main__":
    main()