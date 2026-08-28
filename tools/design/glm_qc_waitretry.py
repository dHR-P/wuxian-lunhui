# -*- coding: utf-8 -*-
"""glm_qc_waitretry.py — glm-5.3-flash 视觉质检，尊重 retry-after 无限重试直到成功。
注重处理 tokenrhythm 上游模型繁忙(UPSTREAM_RATE_LIMITED, HTTP 429)。
Usage:
  python glm_qc_waitretry.py <image.png> <desc> <out_md> [max_attempts]
Probes with tiny payload first; once chat endpoint is reachable, sends the QC.
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "glm-5.3-flash"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def get_retry_after(e):
    try:
        h = e.headers.get("retry-after")
        if h:
            return max(int(float(h)), 5)
    except Exception:
        pass
    return 40


def request(payload, max_attempts):
    key = get_key()
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + key})
    for attempt in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = get_retry_after(e)
                print("   [%d] attempt %d/%d retry-after %ds" %
                      (e.code, attempt, max_attempts, wait), flush=True)
                time.sleep(wait)
                continue
            if e.code in (502, 503, 504, 500):
                time.sleep(30)
                continue
            raise
        except Exception:
            time.sleep(30)
    return None


def b64(url):
    with open(url, "rb") as f:
        return base64.b64encode(f.read()).decode()


def main():
    img, desc, out_md = sys.argv[1], sys.argv[2], sys.argv[3]
    max_attempts = int(sys.argv[4]) if len(sys.argv) > 4 else 40

    # Probe: tiny non-image chat until upstream reachable
    probe = {"model": MODEL,
             "messages": [{"role": "user", "content": "reply: ok"}],
             "max_tokens": 5}
    key = get_key()
    reqp = urllib.request.Request(URL, data=json.dumps(probe).encode(),
                                  headers={"Content-Type": "application/json",
                                           "Authorization": "Bearer " + key})
    print("probing glm upstream...", flush=True)
    reached = False
    for i in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen(reqp, timeout=60) as r:
                reached = True
                print("upstream reachable", flush=True)
                break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = get_retry_after(e)
                print("   probe %d/%d retry-after %ds" % (i, max_attempts, wait), flush=True)
                time.sleep(wait)
                continue
            raise
        except Exception:
            time.sleep(20)
    if not reached:
        print("PROBE NEVER REACHED", flush=True)
        sys.exit(2)

    data_url = "data:image/png;base64," + b64(img)
    rule = ("1)主体与期望设定相符(半透明能量体/内部自发光/仙侠法则, 空灵威严); "
            "2)背景是绝对纯平面纯黑(#000000)可抠图,无星空雾气纹理; "
            "3)全身完整,占满画面高度,脚掌贴底缘被轻微裁切; "
            "4)边缘是清晰硬边,无白描边光晕/无亮白辉光外泄入黑底(对半透明主体允许体内内发光,仅禁外泄光); "
            "5)剪影清晰,主体边缘无暗色碎边窟窿(利于抠图)")
    text = ("你是剑冢禁地素材质检员,只输出中文。下面给出一张素材图,判断是否合格。\n"
            "期望画面描述: " + desc + "\n判据: " + rule + "\n"
            "逐项简短说明,最后给一行明确结论: PASS(合格可进入下一步) 或 FAIL(不合格+具体原因)。")
    content = [{"type": "text", "text": text},
               {"type": "image_url", "image_url": {"url": data_url}}]
    payload = {"model": MODEL,
               "messages": [{"role": "user", "content": content}],
               "max_tokens": 4000}
    resp = request(payload, max_attempts)
    if resp is None:
        print("QC NEVER COMPLETED", flush=True)
        sys.exit(3)
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