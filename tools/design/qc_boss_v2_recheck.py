# -*- coding: utf-8 -*-
"""qc_boss_v2_recheck.py — 复核 BOSS v2 raw 的致命缺陷(脚部截断/贴底缘/绳索)。"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "qwen3.7-flash"
IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_zhouyuan\boss_jiazi_raw2.png"

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""

def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def ask():
    key = get_key()
    du = to_data_url(IMG)
    system = (u"你是严格客观的视觉质检员(视觉模型 qwen3.7-flash)。只依据正式设定和判据逐项判定,"
              u"如实回答,不猜测。特别留意:人物脚部是否被画面边缘裁切、脚底是否接触画面最底边、"
              u"画面有无淡色(灰/紫/蓝)伪影或头发光晕,以及是否可见缠绕手指的绳索并能与手指区分。")
    user = (u"请质检这张 BOSS 立绘。\n"
            u"【正式设定】BOSS 伽椰子 = 苍白长发和服女怨灵:长黑发覆面、惨白脸、白底和服、手指细长。"
            u"立绘要求:纯黑背景、全身完整、脚底贴住画面底缘(不留地面投影)、手指和绳索分离可辨、无白描边/无泛光/无渐变。\n"
            u"【判定任务】\n"
            u"1) 人物下半身与脚部是否完整可见?脚底是否紧贴画面最底边(还是被裁切/悬空/延伸出画面边缘)?请具体描述脚部位置。\n"
            u"2) 画面内是否出现绳索/缠绕手指的线绳?能否确认手指与绳索分离可辨,还是融合?若图中根本无绳索请明说。\n"
            u"3) 头发/边缘有无明显的白描边、泛光或灰蓝/紫色渐变(非纯黑背景的伪影)?\n"
            u"输出 JSON:{\"pass\":bool,\"verdict\":\"PASS\"|\"FAIL\",\"scores\":{\"object\":0-1,\"composition\":0-1,\"background\":0-1,\"integrity\":0-1},\"defects\":[\"...\"]}。")
    body = json.dumps({"model": MODEL, "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": [{"type": "text", "text": user},
                                     {"type": "image_url", "image_url": {"url": du}}]}],
        "max_tokens": 4000, "temperature": 0.2}).encode()
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(URL, data=body, headers={"Authorization": "Bearer "+key,
                "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            msg = (resp.get("choices") or [{}])[0].get("message", {})
            content = msg.get("content") or ""
            reason = msg.get("reasoning_content") or ""
            alltext = content + "\n" + reason
            if not alltext.strip():
                if attempt >= 5: return None, "QC_EMPTY"
                time.sleep(10); continue
            m = re.search(r"\{.*\}", content or alltext, re.DOTALL)
            return (m.group(0) if m else None), alltext
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d: %s" % (attempt, code, e.read().decode(errors="replace")[:200]), flush=True)
            if code == 429: time.sleep(15); continue
            if code >= 500 and attempt < 5: time.sleep(15 if attempt==1 else 20); continue
            if attempt >= 5: return None, "QC_ERROR http%d" % code
            time.sleep(5)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            if attempt >= 5: return None, "QC_ERROR %s" % ex
            time.sleep(5)
    return None, "QC_ERROR"

js, raw = ask()
print("=== JSON ===", flush=True)
print(js, flush=True)
out = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qa_boss_v2_recheck.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump({"json": js, "raw": raw}, f, ensure_ascii=False, indent=2)
print("WROTE %s" % out, flush=True)