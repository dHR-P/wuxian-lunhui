#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""QC 视觉质检：pc_wan1.png 全身立绘完整性判定（调用 tokenrhythm qwen3.7-flash）"""
import json
import base64
import time
import urllib.request
import urllib.error

IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\pc_wan1.png"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_wan1_qwen.json"
API_KEY = "sk_tr_kHjpemePYfJLpsejXmebJsJH8kQHnz-vmXp5JoqG9AQ"
URL = "https://tokenrhythm.studio/v1/chat/completions"

# 读图文件用 Python open+b64encode
with open(IMG, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

data_url = "data:image/png;base64," + b64

SYSTEM = (
    "你是专业游戏美术视觉质检专员。请对给定的全身角色立绘图片逐项进行质检判定。"
    "图片是游戏主角（郑吒）的站立精灵素材。请逐项作答，严格评估：\n"
    "1. 全身完整性：头顶/头发是否在画面内（是否被画面上缘裁掉）？"
    "下半身（膝盖/小腿/脚踝/脚掌/脚趾）是否完整入镜、是否被画面底边裁切？"
    "两条腿都要完整包含脚掌。\n"
    "2. 造型：是否单个人物全身立绘（非3/4身、非半身、非只有上半身）？"
    "有无肢体畸变、有无身体分体/分离、有无多余物体/杂项？\n"
    "3. 背景：是否纯黑或接近纯黑、无杂乱物体？\n"
    "4. 脚底：双脚是否贴近画面底缘，画面底部留白是否很少？\n"
    "最后给出整体结论：判定（通过 / 需重生成）以及理由。"
    "若存在任何裁切（头顶裁掉、脚被切、3/4身、缺脚、只有上半身）则必须判为需重生成。"
)

USER = (
    "请质检这张站立全身立绘图片（游戏主角郑吒）。"
    "按上述维度逐项作答，最后给出 判定（通过/需重生成）与理由。"
)

payload = {
    "model": "qwen3.7-flash",
    "messages": [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": [
            {"type": "text", "text": USER},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]},
    ],
    "max_tokens": 4000,
    "temperature": 0.2,
}


def call_once():
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        URL,
        data=body,
        headers={
            "Authorization": "Bearer " + API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


last_result = None
for attempt in range(1, 6):
    try:
        last_result = call_once()
        break
    except urllib.error.HTTPError as e:
        code = e.code
        detail = ""
        try:
            detail = e.read().decode("utf-8", "replace")
        except Exception:
            pass
        # 429 限流 与 5xx 网关超时/服务端错误 都重试
        if code == 429 or code >= 500:
            wait = 15 if code == 429 else 20
            print(f"[attempt {attempt}] HTTP {code}, sleep {wait}s. detail={detail[:200]}")
            time.sleep(wait)
            continue
        raise SystemExit(f"HTTPError {code}: {detail}")
    except Exception as e:
        print(f"[attempt {attempt}] error: {e}")
        if attempt < 5:
            time.sleep(15)
        else:
            raise

if last_result is None:
    raise SystemExit("failed after 5 attempts")

try:
    answer = last_result["choices"][0]["message"]["content"]
except Exception as e:
    answer = json.dumps(last_result, ensure_ascii=False)

meta = {
    "image": IMG,
    "model": "qwen3.7-flash",
    "raw_response": answer,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print("===== RAW MODEL ANSWER =====")
print(answer)
print("===== END =====")
print("saved to:", OUT)
