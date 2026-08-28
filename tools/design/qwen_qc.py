# -*- coding: utf-8 -*-
"""qwen_qc.py — 用 tokenrhythm/qwen3.7-flash 视觉质检单张图片。
用法:
  python qwen_qc.py <img.png> "<setting_desc>" [out_md]
角色: 视觉质检员(qwen3.7-flash)。以 data URL base64 传图(OpenAI 兼容)。
模型不可读图时该模型不可用; 本脚本以 qwen3.7-flash 的多模态接口判定。
输出: 打印 JSON 结论; 若给 out_md 则落盘 markdown 与原始响应。
判据(在 system 中固化): 对象符合设定 / 背景纯黑 / 主体完整 / 无白描边/光晕/反光污染。
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/png")
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def qc(path, setting_desc, retries=5):
    key = get_key()
    data_url = to_data_url(path)
    system = (
        "你是一名严格、客观的视觉质检员（你使用的模型为 tokenrhythm/qwen3.7-flash）。"
        "对给定图片按下述四条判据逐项给出 通过/不通过 结论，并给出精确、不加猜测的依据："
        "\n1) 对象符合设定：主体与给定设定描述必须一致，禁止凭图片凭空猜测对象身份；"
        "\n2) 背景：若设定/生成要求为纯黑背景，则背景必须是绝对平面纯黑，不得有反光/地面/渐变/辉光/雾/可见情绪色；"
        "\n3) 主体完整：全身肢体、头部、关键特征完整，无截断、无融合畸形、无残缺；"
        "\n4) 污染：无白描边、无白色光晕、无反向发光残留、无背景反光污染主体边缘。"
        "\n只输出 JSON：{\"pass\": bool, \"verdict\": \"PASS|FAIL|RETRY\", "
        "\"scores\": {\"object\": 0-1, \"bg\": 0-1, \"complete\": 0-1, \"no_pollution\": 0-1}, "
        "\"defects\": [\"具体缺陷\"]。若无法清楚判定的客观细节，在 defects 中说明为何无法判别，"
        "不要猜测对象身份、不要编造细节。"
    )
    user_msg = (
        "请质检这张按下列正式设定生成的图片。\n"
        "【正式设定描述】\n%s\n"
        "【质检要求】如实报告，背景是否为纯黑、主体是否完整、有无污染。" % setting_desc
    )
    body = {
        "model": "glm-5.3-flash",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": user_msg},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = resp["choices"][0]["message"]
            content = msg.get("content") or ""
            # glm-5.3-flash 回复可能落在 reasoning_content 字段,需兼容解析
            if not content and msg.get("reasoning_content"):
                content = msg["reasoning_content"]
            print("=== RAW ===", flush=True)
            print(content, flush=True)
            # 提取 JSON(可能包在 markdown 代码块里)
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if m:
                return m.group(0), content
            return content, content
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d: %s" % (attempt, code, e.read().decode(errors="replace")[:200]), flush=True)
            if code in (429, 503, 400):  # 限流/服务忙/临时拒请求 → 长退避重试
                time.sleep(15)
                if code == 503 and attempt >= retries:
                    # 503 额外多给 2 次机会
                    retries = attempt + 2
                continue
            if attempt >= retries:
                return None, "QC_ERROR: HTTP %d" % code
            time.sleep(8)
        except Exception as e:
            print("attempt %d err: %s" % (attempt, e), flush=True)
            if attempt >= retries:
                return None, "QC_ERROR: %s" % e
            time.sleep(8)
    return None, "QC_ERROR"


if __name__ == "__main__":
    img = sys.argv[1]
    desc = sys.argv[2]
    out_md = sys.argv[3] if len(sys.argv) > 3 else None
    js, raw = qc(img, desc)
    result = {"file": os.path.basename(img), "json": js, "raw": raw}
    print("\n=== RESULT ===", flush=True)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    if out_md:
        with open(out_md, "w", encoding="utf-8") as f:
            f.write("# QC: %s\n\n**文件**: `%s`\n\n" % (os.path.basename(img), img))
            f.write("```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
        print("WROTE %s" % out_md, flush=True)
    sys.exit(0)