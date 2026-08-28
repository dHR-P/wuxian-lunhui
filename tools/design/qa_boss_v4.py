# -*- coding: utf-8 -*-
"""qa_boss_v4.py — 用 tokenrhythm/qwen3.7-flash 按 round4 口径质检伽椰子立绘单张图。
用法:
  python qa_boss_v4.py <img> <tag> <outjson> [--relax]
--relax: 第2次质检加分制模式。当 raw4 首检 FAIL 且缺陷仅为「姿态角度不足/发丝细节」时,
  将六条中「头颈反折/发丝缠绕/黑发覆面」三条判为 至少2条达标即可 PASS。
维度: object / composition / background / integrity, 输出 JSON。
口径(round3 校准继承): 指缝是黑发缠绕(非绳索!),不要求绳索;发尾羽化入纯黑为设计意图,不算渐变/泛光缺陷;
  background 只查底部无地面/无投影/整体纯黑;cut 图透明背景为抠图正常结果,不算缺陷。
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
MODEL = "qwen3.7-flash"  # 不带 tokenrhythm/ 前缀

# round4 权威设定(design §9.1 原文) + 判据
SETTING = (
    "BOSS 伽椰子(咒怨,日本凶宅雨夜),正式设定原文如下(唯一权威口径,以此为准):\n"
    "- 日式白衣和服(褴褛、下摆发黑);黑长直发覆面,露出惨白半张脸与黑眼窝;\n"
    "- 四肢着地爬行姿态,头颈反折 90°,从肩膀后回望;\n"
    "- 指尖过长,指缝有黑发缠绕(注意:是黑发缠绕/细黑发丝,不是绳索!设计中不存在绳索元素);\n"
    "- 身体略带半透明,剪影感强,脸部仅一处高光;\n"
    "- 纯黑背景(便于抠图),全身氛围惨绿描边,立绘四周留黑发延伸羽化(发尾自然延伸/羽化入纯黑是设计意图)。"
)

CRITERIA = (
    "【round4 判据定义】(必须严格按下述口径判定,不得加戏):\n"
    "1) object 0-1: 是否为日式女怨灵(白衣和服、黑发覆面、惨白脸、黑眼窝)。是鬼,不是丧尸/人类战士。\n"
    "2) composition 0-1: 全身完整从头到脚、主体居中放大、脚底(或爬行姿态的末端延伸肢体)接触/贴近画面底缘"
    "(爬行姿态允许末端肢体被底缘轻微裁切,但不得大面积缺脚/缺下半身/主体被大幅裁切)。\n"
    "   !!! 设定中没有绳索元素,不得要求画面出现绳索,也不得以'缺少绳索'判 FAIL。\n"
    "3) background 0-1: 纯黑背景。只检查:底部无地面、无投影、整体为纯黑、无杂色渐变。"
    "发尾自然延伸并入纯黑背景(羽化)是设计意图,不算渐变/泛光缺陷。"
    "若为已抠图去背的透明 PNG,透明背景是抠图正常结果,不算背景缺陷(只评估保留的主体区域)。\n"
    "4) integrity 0-1: 指缝细黑发丝缠绕可辨(非环/绳带)、手指未融合、无白色描边、无多余物件;\n"
    "   其中姿态判定:设定是'四肢着地爬行+头颈反折90°从肩膀后回望',若头部明显转向背后/面向镜头回望(即使是爬行中回望)即算达标。\n"
    "只输出 JSON: {\"pass\":bool,\"verdict\":\"PASS\"|\"FAIL\","
    "\"scores\":{\"object\":0-1,\"composition\":0-1,\"background\":0-1,\"integrity\":0-1},"
    "\"defects\":[\"具体缺陷...\"]}。如实报告,不臆造;若客观无法判定某项,在 defects 中说明但不猜测身份。"
)

# relax 加分制提示(第2次质检用)
RELAX_NOTE = (
    "\n【加分制提示(本次质检适用)】本立绘最终将用于游戏内 32px 敌人小图,姿态/发丝/覆面的细节不苛求完美。"
    "在以下三条中——①头颈反折(头部明显转向背后/面向镜头回望);②指缝有细黑发丝缠绕(非环绳);"
    "③黑发覆面露惨白半脸——只要【至少 2 条】明确达标,integrity 即视为可通过。"
    "如实报告三条各自是否达标,再给 final 判定。"
)


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/png")
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def ask(img, relax):
    key = get_key()
    du = to_data_url(img)
    tail = USER_TAIL + (RELAX_NOTE if relax else "")
    body = json.dumps({"model": MODEL, "messages": [
        {"role": "system", "content": "你是一名严格、客观但注重实用(游戏 32px 敌人小图)的视觉质检员"
                                      "(视觉模型 qwen3.7-flash)。严格依据给定正式设定与判据逐项判定,如实报告,不臆造,不猜测身份。"},
        {"role": "user", "content": [{"type": "text", "text": tail},
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
            alltext = content + "\n[reasoning]\n" + reason
            if not alltext.strip():
                if attempt >= 6: return None, "QC_EMPTY"
                time.sleep(10); continue
            m = re.search(r"\{.*\}", content or alltext, re.DOTALL)
            return (m.group(0), alltext) if m else (None, alltext)
        except urllib.error.HTTPError as e:
            code = e.code
            print("attempt %d HTTP %d: %s" % (attempt, code, e.read().decode(errors="replace")[:200]), flush=True)
            if code == 429:
                time.sleep(15); continue
            if code in (502, 503, 504) and attempt < 6:
                time.sleep(20); continue
            if attempt >= 6: return None, "QC_ERROR http%d" % code
            time.sleep(8)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            if attempt >= 6: return None, "QC_ERROR %s" % ex
            time.sleep(8)
    return None, "QC_ERROR"


USER_TAIL = (
    "请质检这张「伽椰子」BOSS 立绘。\n【正式设定】\n" + SETTING + "\n" + CRITERIA
    + "\n判定后给出结论 JSON: 该图是否 PASS? 若不通过,列出具体致命缺陷与下一步建议。"
)


def main():
    args = sys.argv[1:]
    img = args[0]
    tag = args[1]
    outjson = args[2]
    relax = "--relax" in args
    js, raw = ask(img, relax)
    print("=== JSON ===", flush=True)
    print(js, flush=True)
    if not js:
        print("QC failed for %s" % img, flush=True)
    result = {"tag": tag, "file": os.path.basename(img), "path": img, "relax": relax,
              "setting": SETTING, "criteria": CRITERIA, "json": js, "raw": raw}
    os.makedirs(os.path.dirname(outjson), exist_ok=True)
    with open(outjson, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("WROTE %s" % outjson, flush=True)
    sys.exit(0)


if __name__ == "__main__":
    main()