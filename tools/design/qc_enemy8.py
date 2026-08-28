# -*- coding: utf-8 -*-
"""qc_enemy8.py — 用 tokenrhythm/qwen3.7-flash 视觉质检单张 raw/cut 立绘。
用法: <comfy-python> qc_enemy8.py <img> <raw|cut> <slug> <out_md>
角色: 视觉质检员(qwen3.7-flash)。data URL base64 传图，max_tokens 4000，
      429 退避 15s×5，5xx 退避；回复可能落在 reasoning_content，需兼容提取。
输出: 判定 JSON 与原始回复写 out_md，stdout 打印 RESULT 判定 JSON。
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
MODEL = "qwen3.7-flash"  # 任务指定 qwen3.7-flash（不带 tokenrhythm/ 前缀）

# slug -> 正式设定描述（与 gen_enemy8.py PROMPTS 一致）
SETTING = {
    "ghoul": "食尸鬼 ghoul：极度苍白的腐烂人形，体表灰白泛青布满腐烂溃烂与血管纹，佝偻驼背，双臂极长短……实际对照画面判断为灰白/腐烂类人形怪物，非普通人类。",
    "cultist": "邪教徒 cultist：穿暗红褐连帽长袍、兜帽遮面，面戴惨白骨质面具，手持弯曲匕首，双腿站立。",
    "robot": "机械兵 robot：金属人形骨架外露、暗色装甲拼接、胸腔红色核心光、双眼刺目红点、机械爪，直立。",
    "insect": "虫族 insect：深色甲壳直立虫形、多足、顶部弯触角、复眼幽光、前肢镰刀螯，直立多足。",
    "wraith": "怨灵 wraith：半透明幽怨灵体，下摆溶为幽雾，细长鬼爪，面孔模糊、眼放暗淡幽光，漂浮离地。",
    "brute": "巨魔 brute：体型巨大的粗壮怪物，暗灰泛绿皮肤、肩背骨板甲、粗壮双臂、巨大骨锤拳、獠牙外翻，俯身前倾站姿。",
    "mummy": "木乃伊 mummy：干枯木乃伊，全身缠泛黄绷带、局部松脱露焦黑干皮，双臂交叉胸前，脸裹绷带露凹陷眼口，埃及披肩头饰，伛偻站姿。",
    "sea_creature": "深海异形 sea_creature：半透明幽蓝深海人形生物，体表发光斑点，头部两侧扇形鳍膜，触手自背肩与下躯延伸，蹼状手爪，脚带鳍膜，悬浮。",
}

RULES = ("你必须严格依据给出的【正式设定】对照图片逐项判定，逐条输出 通过/不通过+依据，"
         "最后输出 JSON 结论文档。不凭图胡乱猜测身份。")


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def ask(path, kind, slug, retries=8, patient=False):
    key = get_key()
    du = to_data_url(path)
    setting = SETTING.get(slug, "")
    if kind == "raw":
        lead = "这是一张以纯黑为背景生成的普通敌人浑身立绘 PNG（768x1024）。"
        bg_rule = ("背景必须绝对平面纯黑（四角近纯黑、无地面投影/地面反光/渐变/雾/光晕/大面积灰霾）；"
                   "主体边缘为冷白偏蓝 rim light 硬边，边缘无任何白色描边外溢、无反向发光晕、无杂散白点。")
        body_rule = ("主体全身完整：从头到脚都在画面内（可接受脚掌贴近底缘被轻裁切），"
                     "肢体/关键特征完整无畸形融合、无残缺、无错位、无多肢少肢。")
    else:
        lead = "这是一张已抠图去背的透明 PNG（背景已抠为全透明，前景为主体）。"
        bg_rule = ("背景必须完全透明（除主体外全部 alpha=0），无黑色/白色残留底色、无残留灰边。")
        body_rule = ("主体完整从头到脚，肢体/特征完整无镂空窟窿、无残缺、无毛边碎屑；"
                     "主体与透明背景分离自然，边缘无白边/黑边/光晕/发灰晕边，透明区无散落脏点。")
    user = (
        "请质检这张普通敌人立绘。%s\n\n【正式设定】\n%s\n\n判据：\n"
        "1) 对象符合设定：主体类型与设定一致；\n"
        "2) 背景：%s\n"
        "3) 主体完整：%s\n"
        "4) 贴底：%s\n"
        "输出 JSON：{\"pass\": bool, \"verdict\": \"PASS|FAIL|RETRY\", "
        "\"scores\": {\"object\":0-1,\"bg\":0-1,\"complete\":0-1,\"edges\":0-1}, "
        "\"defects\":[具体缺陷]}"
    ) % (
        lead, setting, bg_rule, body_rule,
        "脚掌贴近画面底缘并被轻微贴底裁切" if kind == "raw" else "主体底部贴画面底缘，不悬空（漂浮类如怨灵/深海异形除外，本类允许离地）",
    )
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": RULES},
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
                content = msg.get("reasoning_content") or ""
            if not content or not content.strip():
                print("attempt %d empty" % attempt, flush=True)
                if attempt >= retries:
                    return None, "QC_EMPTY"
                time.sleep(10)
                continue
            jm = re.search(r"\{.*\}", content, re.DOTALL)
            js = jm.group(0) if jm else content
            return js, content
        except urllib.error.HTTPError as e:
            code = e.code
            em = e.read().decode(errors="replace")[:300]
            print("attempt %d HTTP %d: %s" % (attempt, code, em), flush=True)
            if code == 429:
                time.sleep(25 if patient else 15)
                continue
            if code >= 500:
                # 上游 503/504/SERVICE_BUSY 抖动用更长退避
                if patient:
                    time.sleep(min(15 + attempt * 5, 60))
                else:
                    time.sleep(10 if attempt == 1 else 20)
                continue
            if attempt >= retries:
                return None, "QC_ERROR http%d %s" % (code, em)
            time.sleep(5)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            if attempt >= retries:
                return None, "QC_ERROR %s" % ex
            time.sleep(5 if not patient else 15)
    return None, "QC_ERROR"


if __name__ == "__main__":
    img, kind, slug, out_md = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    js, raw = ask(img, kind, slug)
    result = {"file": os.path.basename(img), "kind": kind, "slug": slug, "json": js, "raw": raw}
    print("\n=== RESULT ===", flush=True)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC: %s (%s)\n\n**文件**: `%s`\n\n" % (os.path.basename(img), kind, img))
        f.write("**设定**: %s\n\n" % SETTING.get(slug, ""))
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    print("WROTE %s" % out_md, flush=True)
    sys.exit(0)
