# -*- coding: utf-8 -*-
"""pose_detail_r5.py — 专门核对「头颈反折」姿态的细节判定(glm-5.3-flash)。
针对伽椰子立绘,让模型详细描述:身体爬行方向、头/颈/脸的朝向、脸是否面向镜头、
头是否从肩后反折回望。用于消除 r5 首检与复检对 pose_reversed 的分歧。
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "glm-5.3-flash"

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    return re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t).group(1).strip()

def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def ask(img):
    key = get_key()
    du = to_data_url(img)
    user = (
        "请非常仔细地观察这张日本女怨灵(伽椰子)立绘,并逐项如实描述(不要用笼统结论,要给出可复核的结构描写):\n"
        "1. 身体姿态:是四肢着地爬行,还是其他(半立/站立/蹲坐)?四肢(手掌与脚/膝盖)位置?爬行方向朝哪(朝镜头/背对镜头/侧面)?\n"
        "2. 头颈朝向:她的头部和脖颈具体朝向哪里?脸/五官的方向?她的头有没有从肩膀或脖颈处反折回来面向镜头?"
        "头颈反折回望 的定义是 头在身体后方/肩后、面向镜头, 像回头或转头看镜头; 还是头在前方正常朝前?\n"
        "3. 脸朝向镜头吗?眼睛/黑眼窝能否直视到观察者?\n"
        "4. 头发是否覆盖大半张脸,只露惨白半张脸?\n"
        "5. 画面里除了她,还有没有其他不该存在的物体/动物/生物(如猫头鹰、鸟、动物头)?\n"
        "6. 背景是否纯黑?四肢/发尾有没有明显被画面边缘裁切?\n"
        "请用中文分段回答以上 6 项;最后给出一行结论:REVERSED=是/否(头颈是否反折回望),EXTRA=有/无(多余异物),USABLE=可用降标稿是/否。"
    )
    body = json.dumps({"model": MODEL, "messages": [
        {"role": "system", "content": "你是一名严谨的视觉审图员(模型 glm-5.3-flash)。基于图片像素如实描述,不推测、不脑补、不为了讨好而下结论。"},
        {"role": "user", "content": [{"type": "text", "text": user},
                                     {"type": "image_url", "image_url": {"url": du}}]}],
        "max_tokens": 4000, "temperature": 0.2}).encode()
    for attempt in range(1, 7):
        try:
            req = urllib.request.Request(URL, data=body, headers={"Authorization": "Bearer " + key,
                "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=200) as r:
                resp = json.loads(r.read().decode())
            msg = (resp.get("choices") or [{}])[0].get("message", {})
            content = msg.get("content") or ""
            reason = msg.get("reasoning_content") or ""
            alltext = content + (("\n[reasoning]\n" + reason) if reason.strip() else "")
            if alltext.strip():
                return alltext
            if attempt >= 6: return "QC_EMPTY"
            time.sleep(10)
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d" % (attempt, code), flush=True)
            if code == 429: time.sleep(15); continue
            if code in (502,503,504) and attempt < 6: time.sleep(20); continue
            if attempt >= 6: return "QC_ERROR http%d" % code
            time.sleep(8)
        except Exception as ex:
            print("attempt %d err %s" % (attempt, ex), flush=True)
            if attempt >= 6: return "QC_ERROR %s" % ex
            time.sleep(8)
    return "QC_ERROR"

if __name__ == "__main__":
    img = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    res = ask(img)
    print("=== DETAIL ===", flush=True)
    print(res, flush=True)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(res)
        print("WROTE %s" % out, flush=True)