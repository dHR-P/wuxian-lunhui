# -*- coding: utf-8 -*-
"""Visual QC for H3 video frames using glm-5.3-flash (tokenrhythm, OpenAI-compatible).
Usage: python h3_qc_glm.py <clip_name> <expected_desc> <frame1.png> [frame2.png] ...
Writes a verdict to stdout and appends a markdown entry to h3_qc_out.md
Model name sent as "glm-5.3-flash" (no tokenrhythm/ prefix)."""
import base64, json, os, sys, time, urllib.request, urllib.error

API_KEY = "sk_tr_ZKpYni9Ske1UDTEBQwX3J8G5OElreEleFdnF1hyjOH4"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "glm-5.3-flash"


def b64(url):
    with open(url, "rb") as f:
        return base64.b64encode(f.read()).decode()


def call(payload):
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + API_KEY})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 15 * (attempt + 1)
                print(f"   [429] retry after {wait}s", flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("429 retries exhausted")


def main():
    clip = sys.argv[1]
    desc = sys.argv[2]
    frames = sys.argv[3:]
    images = []
    figmap = {}
    for i, p in enumerate(frames):
        key = f"frame{i+1}"
        images.append({"type": "image_url",
                       "image_url": {"url": "data:image/png;base64," + b64(p)}})
        figmap[key] = p
    refs = "\n".join(f"- {k}: {v}" for k, v in figmap.items())
    content = [{"type": "text", "text": (
        "你是视频过场素材质检员。下面给出同一段视频的 3 张抽帧图，判断该过场视频是否合格。\n"
        "期望画面描述：" + desc + "\n"
        "判据：1)画面与期望描述相符(场景/主体/色调/镜头意图)；2)暗调氛围、风格统一；"
        "3)无文字/水印/logo；4)无明显畸变/坏帧；5)三帧风格连贯、无明显过度闪烁。\n"
        "逐帧简短说明，最后给一行结论：PASS（合格）或 FAIL（不合格+具体原因）。")}]
    content += images
    payload = {"model": MODEL, "messages": [{"role": "user", "content": content}],
               "max_tokens": 4000}
    st = time.time()
    resp = call(payload)
    msg = resp["choices"][0]["message"]
    text = msg.get("content")
    if not text and "reasoning_content" in msg:
        text = msg["reasoning_content"]
    text = text or "(no content)"
    dur = time.time() - st
    print("=== QC RESULT:", clip, "===")
    print(text)
    print(f"[latency={dur:.1f}s]")
    verdict = "PASS" if text.strip().split("PASS") and "FAIL" not in text.split("结论:")[-1].split("结论：")[-1][:10] else "FAIL"
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "h3_qc_out.md"), "a", encoding="utf-8") as f:
        f.write(f"\n## {clip}\n- 期望: {desc}\n- 帧: {refs}\n- 判定: {verdict}\n- 模型输出:\n```\n{text}\n```\n")
    print("VERDICT_BOXED:", verdict)


if __name__ == "__main__":
    main()