# -*- coding: utf-8 -*-
"""qa_zhouyuan.py — Z宇宙箱庭「咒怨素材」视觉质检(依据 qc_wan1.py 已验证格式)。
调用 tokenrhythm/qwen3.7-flash (OpenAI 兼容, data URL base64 传图)。
口径:
  - BOSS 伽椰子 = 苍白长发和服女怨灵(日式恐怖)
  - 场景 = 日本凶宅雨夜(灰蓝/惨绿冷调)
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
API_URL = "https://tokenrhythm.studio/v1/chat/completions"

def api_key():
    with open(CRED, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("TOKENRHYTHM_API_KEY:"):
                return line.split(":", 1)[1].strip()
    raise RuntimeError("TOKENRHYTHM_API_KEY not found")

def b64_data_url(path):
    with open(path, "rb") as f:
        raw = f.read()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii"), len(raw)

def call_qwen(system, user, image_path):
    data_url, nbytes = b64_data_url(image_path)
    payload = {
        "model": "qwen3.7-flash",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }
    body = json.dumps(payload).encode("utf-8")
    last = None
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(API_URL, data=body,
                                         headers={"Authorization": "Bearer " + api_key(),
                                                  "Content-Type": "application/json"},
                                         method="POST")
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"], nbytes
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode("utf-8", "replace")
            except Exception:
                pass
            if e.code == 429 or e.code >= 500:
                wait = 15 if e.code == 429 else 20
                print("  [HTTP %d] retry in %ds (att %d/5) detail=%s" %
                      (e.code, wait, attempt, detail[:200]), flush=True)
                time.sleep(wait)
                continue
            raise RuntimeError("HTTP %d: %s" % (e.code, detail))
        except Exception as e:
            print("  [err] att %d: %s" % (attempt, e), flush=True)
            if attempt < 5:
                time.sleep(15)
            else:
                raise
        if last is not None:
            return last, nbytes
    raise RuntimeError("exhausted retries")


def qa(image_path, kind, label, is_boss):
    if is_boss:
        system = (
            "你是专业游戏美术视觉质检专员。这是 BOSS 立绘(伽椰子,日式恐怖女怨灵)的质检。请严格评估:\n"
            "1. 主体完整:全身完整入镜,头顶不被裁掉,脚底贴近底缘,无肢体畸变/分体/肢体缺失。\n"
            "2. 造型:苍白长发、和服、女性怨灵形象,日式恐怖氛围。\n"
            "3. 背景:纯黑或接近纯黑、均匀、无白描边、无背景杂物/投影/辉光。\n"
            "最后给出整体结论:判定(合格/不合格)与理由,并列明缺陷清单。"
            "若背景非纯黑、有白描边、或主体不完整则不合格。"
        )
        user = "质检这张%s(伽椰子BOSS立绘)。逐项评估后给出 判定(合格/不合格)、缺陷清单、说明。" % label
    else:
        system = (
            "你是专业游戏美术视觉质检专员。这是日本凶宅雨夜背景场景图的质检。请严格评估:\n"
            "1. 场景内容:是否呈现日本凶宅/日式和风室内或宅邸外观,符合%s设定。\n"
            "2. 色调氛围:是否灰蓝/惨绿冷调、雨夜、阴森压抑的恐怖氛围。\n"
            "3. 构图:是否清晰完整、无明显畸变/空洞/色斑/夹杂杂物。\n"
            "最后给出整体结论:判定(合格/不合格)与理由,并列明缺陷清单。"
        )
        system = system % (kind + " 场景口径")
        user = "质检这张%s场景背景图。逐项评估后给出 判定(合格/不合格)、缺陷清单、说明。" % label
    return call_qwen(system, user, image_path)


def main():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "design")
    raw = os.path.join(base, "raw_zhouyuan")
    cut = os.path.join(base, "cutout_out")
    results = []

    scenes = [
        ("scene_house_exterior_v1", "日本凶宅雨夜屋外街景(灰蓝/惨绿冷调和风凶宅外立面)", False),
        ("scene_corridor_v1", "日本凶宅雨夜屋内走廊(灰蓝/惨绿冷调昏暗和风长走廊)", False),
        ("scene_room_v1", "日本凶宅雨夜屋内房间(灰蓝/惨绿冷调空荡和风房间)", False),
        ("scene_attic_v1", "日本凶宅雨夜阁楼(灰蓝/惨绿冷调狭小幽闭储物阁楼)", False),
        ("scene_battle_v1", "日本凶宅雨夜对战场景(灰蓝/惨绿冷调较开阔战斗空间)", False),
        ("boss_jiazi_raw", "boss_jiazi_raw(伽椰子BOSS原始立绘,纯黑背景)", True),
        ("boss_jiazi_cut", "boss_jiazi_cut(伽椰子BOSS抠图透明背景版)", True),
    ]

    for slug, kind, is_boss in scenes:
        if slug.startswith("boss") and "_cut" in slug:
            p = os.path.join(cut, slug + ".png")
        else:
            p = os.path.join(raw, slug + ".png")
        print("QA %s ..." % slug, flush=True)
        try:
            text, nb = qa(p, kind, slug, is_boss)
            results.append({"slug": slug, "path": p, "bytes": nb, "answer": text})
            print("  -> " + text.replace("\n", " | ")[:500], flush=True)
        except Exception as e:
            results.append({"slug": slug, "path": p, "bytes": -1, "answer": "QA_ERROR: %s" % e})
            print("  -> ERROR %s" % e, flush=True)

    with open(os.path.join(base, "qa_zhouyuan_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("=== saved qa_zhouyuan_results.json ===", flush=True)


if __name__ == "__main__":
    sys.exit(main())