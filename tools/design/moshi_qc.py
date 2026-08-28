# -*- coding: utf-8 -*-
"""moshi_qc.py — 末世死城素材视觉质检（tokenrhythm 视觉模型 glm-5.3-flash）。
用法:
  python moshi_qc.py <img.png> "<类型:scene|boss_raw|boss_cut>" "<设定描述>" <out_md>
角色: 视觉质检员（模型 glm-5.3-flash；注意模型名不带 tokenrhythm/ 前缀，带前缀会返回
      MODEL_NOT_AVAILABLE）。
传图: data URL base64（OpenAI 兼容）。429 退避 15s×5；5xx 退避重试。
输出: 判定 JSON 与原始回复落盘到 out_md，并在 stdout 打印 RESULT 判定行。
兼容: 回复内容可能落在 message.content 或 message.reasoning_content，两处均尝试提取 JSON。
"""
import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "glm-5.3-flash"  # 2026-08-27 起视觉质检改用 glm-5.3-flash（不带前缀）


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def system_prompt(kind):
    common = (
        "你是一名严格、客观的视觉质检员（你使用的视觉模型为 qwen3.7-flash）。"
        "不得凭图片凭空猜测对象身份，只依据给出的【正式设定描述】对照图片逐项判定。"
        "逐条给出『通过/不通过 + 依据』，最后输出 JSON 结论文档。"
    )
    return common


def ask(path, kind, setting_desc, retries=5):
    key = get_key()
    du = to_data_url(path)
    if kind == "scene":
        user = (
            "请质检这张【场景背景图】（768x1024，末世死城背景，不要求纯黑背景）。\n"
            "【正式设定描述】\n%s\n"
            "判据：\n"
            "1) 对象/内容符合设定：主体与设定场景一致，不凭空臆断；\n"
            "2) 构图/色调：符合设定的主色调（黄昏橙灰/冷绿/深蓝荧光/夕照等），整体为末世废墟昏暗氛围；\n"
            "3) 无污染：无文字水印、无突兀 UI、无逻辑割裂或毫无意义的留白；\n"
            "4) 完整性：构图有明确主体与纵深，不糊、不过度空泛。\n"
            "输出 JSON：{\"pass\": bool, \"verdict\": \"PASS|FAIL|RETRY\", "
            "\"scores\": {\"object\":0-1,\"composition\":0-1,\"no_pollution\":0-1,\"color_tone\":0-1}, "
            "\"defects\":[具体缺陷]}"
        ) % setting_desc
    else:
        # boss_raw / boss_cut
        if kind == "boss_cut":
            lead = "这是一张已抠图去背的透明 PNG（背景被抠为全透明）。"
        else:
            lead = "这是一张以纯黑为背景生成的 BOSS 全身立绘 PNG。"
        user = (
            "请质检这张 BOSS 立绘。\n%s\n"
            "【正式设定描述】\n%s\n"
            "判据：\n"
            "1) 对象符合设定：主体与设定一致（怪物类，不误判为人类/穿衣物角色）；\n"
            "2) 背景：%s；\n"
            "3) 主体完整：全身从头到脚都在，肢体/头部/关键特征完整，无畸形融合、无残缺、无错位；\n"
            "4) 污染：%s；\n"
            "5) 贴底：脚掌贴近画面底缘并被轻裁切，下半身不呈剪影。\n"
            "输出 JSON：{\"pass\": bool, \"verdict\": \"PASS|FAIL|RETRY\", "
            "\"scores\": {\"object\":0-1,\"bg\":0-1,\"complete\":0-1,\"no_pollution\":0-1}, "
            "\"defects\":[具体缺陷]}"
        ) % (
            lead,
            setting_desc,
            "纯黑背景必须绝对平面纯黑，无地面投影/反光/渐变/光晕/雾" if kind == "boss_raw"
            else "背景必须完全透明（除主体外全透），无残留底色/黑边",
            "无白色描边/光晕/反向发光/背景反光污染主体边缘" if kind == "boss_raw"
            else "主体边缘无白边/黑边/发灰晕边，画面无散落碎点",
        )
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt(kind)},
            {"role": "user", "content": [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": du}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }).encode()
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = (resp.get("choices") or [{}])[0].get("message", {}) or {}
            content = msg.get("content") or ""
            if not content or not content.strip():
                # glm-5.3-flash 回复可能落在 reasoning_content 字段，兼容提取
                content = msg.get("reasoning_content") or ""
            if not content or not content.strip():
                print("attempt %d empty content" % attempt, flush=True)
                if attempt >= retries:
                    return None, "QC_EMPTY"
                time.sleep(10)
                continue
            jm = re.search(r"\{.*\}", content, re.DOTALL)
            js = jm.group(0) if jm else content
            return js, content
        except urllib.error.HTTPError as e:
            code = e.code
            msg = e.read().decode(errors="replace")[:300]
            print("attempt %d HTTP %d: %s" % (attempt, code, msg), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if code >= 500:
                time.sleep(10 if attempt == 1 else 20)
                continue
            if attempt >= retries:
                return None, "QC_ERROR http%d %s" % (code, msg)
            time.sleep(5)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            if attempt >= retries:
                return None, "QC_ERROR %s" % ex
            time.sleep(5)
    return None, "QC_ERROR"


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("usage: moshi_qc.py <img> <scene|boss_raw|boss_cut> <setting_desc> <out_md>")
        sys.exit(2)
    img = sys.argv[1]
    kind = sys.argv[2]
    desc = sys.argv[3]
    out_md = sys.argv[4]
    js, raw = ask(img, kind, desc)
    result = {"file": os.path.basename(img), "kind": kind, "json": js, "raw": raw}
    print("\n=== RESULT ===", flush=True)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC: %s (%s)\n\n**文件**: `%s`\n\n" % (os.path.basename(img), kind, img))
        f.write("**设定**: %s\n\n" % desc)
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    print("WROTE %s" % out_md, flush=True)
    sys.exit(0)