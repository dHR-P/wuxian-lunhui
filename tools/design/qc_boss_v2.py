# -*- coding: utf-8 -*-
"""qc_boss_v2.py — 咒怨 BOSS v2(raw / cut)视觉质检(tokenrhythm/qwen3.7-flash)。

质检两张图:
  A) BOSS v2 原图 raw2
  B) BOSS v2 抠图 cut_v2
以 data URL base64 传图(OpenAI 兼容)。429/5xx 退避重试(429 退 15s×5)。
回复内容可能在 reasoning_content 字段,解析时 content 与 reasoning_content 都检查。
输出任务要求的 JSON 结构:
  {"pass":true/false,"verdict":"PASS"/"FAIL","scores":{"object":0-1,"composition":0-1,"background":0-1,"integrity":0-1},"defects":[...]}
"""
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
MODEL = "qwen3.7-flash"  # 注意:不带 tokenrhythm/ 前缀

# 正式设定 + 判据(BOSS 伽椰子)
SETTING = (
    "BOSS 伽椰子 = 苍白长发和服女怨灵(日式恐怖怨灵):"
    "长黑发覆面、惨白脸、白底和服、手指细长。"
    "立绘要求:纯黑背景、全身完整、脚底贴住画面底缘(不留地面投影)、"
    "手指和绳索分离可辨、无白描边/无泛光/无渐变。"
)

REQUIRED_SCHEMA = (
    '输出 JSON(只输出 JSON,不要多余文字):'
    '{"pass":true/false,"verdict":"PASS"/"FAIL",'
    '"scores":{"object":0-1,"composition":0-1,"background":0-1,"integrity":0-1},'
    '"defects":["具体缺陷"]}。其中:'
    'background 检查是否纯黑背景;'
    'integrity 检查是否脚贴底缘 + 手指绳索分离 + 无白描边。'
)


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def ask(path, is_cut):
    key = get_key()
    du = to_data_url(path)
    if is_cut:
        lead = (u"这是一张已抠图去背的透明 PNG(原黑背景被抠为全透明),"
                u"质检时请忽略全透明区域,只评估保留的主体区域本身。")
    else:
        lead = u"这是一张以纯黑为背景生成的 BOSS 全身立绘 PNG。"
    system = (
        u"你是一名严格、客观的视觉质检员(你的视觉模型为 qwen3.7-flash)。"
        u"禁止凭图片凭空猜测对象身份,只依据下面给出的【正式设定描述】对照图片逐项判定,"
        u"如实报告缺陷,不得编造。要求每条判据给『通过/不通过 + 依据』。"
    )
    user = (
        u"请质检这张按照下列正式设定生成的 BOSS 立绘。\n"
        u"%s\n"
        u"【正式设定描述】\n%s\n"
        u"【质检判据】\n"
        u"1) object 对象一致性:主体是否为你天下述设定中的对象(苍白长发和服女怨灵:长黑发覆面、惨白脸、白底和服、手指细长),不误判;0-1 分。\n"
        u"2) composition 构图:全身完整从头到脚、无截断/畸形/残肢、构图符合立绘规范;0-1 分。\n"
        u"3) background 背景:%s;0-1 分。\n"
        u"4) integrity 完整度:脚底贴住画面底缘(不留地面投影)+ 手指与绳索分离可辨 + 无白描边/无泛光/无渐变;0-1 分。\n"
        u"%s"
    ) % (
        lead,
        SETTING,
        (u"纯黑背景必须绝对平面纯黑,无地面投影/反光/渐变/光晕/雾/杂物" if not is_cut
         else u"透明背景除主体外全透明,无残留底色/黑边/杂色,主体边缘干净"),
        REQUIRED_SCHEMA,
    )
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": du}},
            ]},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
    }).encode()
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = (resp.get("choices") or [{}])[0].get("message", {})
            content = msg.get("content") or ""
            reason = msg.get("reasoning_content") or ""
            alltext = content + "\n" + reason
            if not alltext.strip():
                print("attempt %d empty content+reasoning" % attempt, flush=True)
                if attempt >= 5:
                    return None, "QC_EMPTY"
                time.sleep(10)
                continue
            # 尽量从 content 提取 JSON,否则从拼接文本提取
            js = extract_json(content) or extract_json(alltext)
            return js, alltext
        except urllib.error.HTTPError as e:
            code = e.code
            msg = e.read().decode(errors="replace")[:300]
            print("attempt %d HTTP %d: %s" % (attempt, code, msg), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if code >= 500 and attempt < 5:
                time.sleep(15 if attempt == 1 else 20)
                continue
            if attempt >= 5:
                return None, "QC_ERROR http%d %s" % (code, msg)
            time.sleep(5)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            if attempt >= 5:
                return None, "QC_ERROR %s" % ex
            time.sleep(5)
    return None, "QC_ERROR"


def extract_json(text):
    if not text:
        return None
    # 优先匹配整段的 JSON object
    for m in re.finditer(r"\{[^{}]*\}", text):
        cand = m.group(0)
        try:
            obj = json.loads(cand)
            if isinstance(obj, dict) and "pass" in obj and "verdict" in obj:
                return json.dumps(obj, ensure_ascii=False)
        except Exception:
            continue
    # 回退:贪婪匹配
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        return m.group(0)
    return None


if __name__ == "__main__":
    jobs = [
        ("A_raw2", r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_zhouyuan\boss_jiazi_raw2.png", False),
        ("B_cutv2", r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\cutout_out\boss_jiazi_cut_v2.png", True),
    ]
    results = {}
    for tag, p, iscut in jobs:
        print("=== QC %s %s ===" % (tag, p), flush=True)
        js, raw = ask(p, iscut)
        # 尝试解析为标准结构(便于脚本自检),失败不阻断
        parsed = None
        if js:
            try:
                parsed = json.loads(js)
            except Exception:
                parsed = None
        results[tag] = {"file": os.path.basename(p), "kind": "cut" if iscut else "raw",
                        "json_parsed": parsed, "json_text": js, "raw": raw}
        print(json.dumps(results[tag], ensure_ascii=False), flush=True)
    out = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qa_boss_v2_results.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"setting": SETTING, "results": results}, f, ensure_ascii=False, indent=2)
    print("WROTE %s" % out, flush=True)