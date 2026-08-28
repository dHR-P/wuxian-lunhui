# -*- coding: utf-8 -*-
"""qc_npc10b.py — 职业型 NPC 立绘质检(qwen3.7-flash)，修正判据避免误判。
相对 qc_enemy8.ask 的修正:
 1) 对象判据按 NPC 正式设定(非"普通敌人")。
 2) 不要求"冷白 rim light"(任务要求禁外泄白晕、硬边), 改为检查"背景纯黑平底+边缘无白晕残留"。
 3) 贴底判据仅作构图偏好提示, 不算硬缺陷(生成器普遍留黑隙, 不影响 floodfill)。
用法: <comfy-python> qc_npc10b.py <img> <slug> <out_md>
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
MODEL = "qwen3.7-flash"

# slug -> 中文正式设定
SETTING = {
    "npc_guard": "守卫: 成年亚洲男性, 深蓝制服+臂章肩章+黑色大檐帽, 双手在腰间持黑手枪（安全收枪位）, 严肃。",
    "npc_survivor": "幸存者: 30多岁平民男性, 破旧染污深色外套+皱衬衫, 脸上尘土与抓伤, 惊恐瞪眼, 抱臂缩身。",
    "npc_watcher": "守夜人: 消瘦成年身形, 兜帽罩面, 深灰兜帽长袍, 单手胸前提旧铁油灯, 灯光只在小范围不外泄, 警戒。",
    "npc_merchant": "商人: 中年男性, 体面暗色西装背心/白衬衫领带, 金怀表链, 托钱袋, 精明算计眼神。",
    "npc_doctor": "医生: 成年（男女皆可）, 白大褂+颈挂听诊器, 持记录板, 专业平静。",
    "npc_soldier": "士兵: 成年男性, 深绿野战军装+战术防弹背心+头盔, 双手胸前持步枪（枪口朝上安全）, 警觉。",
    "npc_villager": "村民: 中年男性, 朴素粗布农装, 草帽/布巾, 对襟布褂+布裤+草鞋, 持竖立锄头, 朴实疲惫。",
    "npc_elder": "老者: 消瘦老人, 白发白须满脸皱纹, 深色长袍, 单手拄木杖, 慈祥疲惫。",
    "npc_child": "孩童: 约6岁小孩, 圆脸大眼天真, 朴素便装, 双手放松, 略带戒备的期盼神情。",
    "npc_woman": "现代女性NPC: 30岁知性女性, 短发, 深色西装外套+衬衫, 及膝铅笔裙, 提小包, 端庄。",
}

RULES = ("你是一名资深游戏美术视觉质检员。必须严格依据【正式设定】对照图片逐项判定，"
         "逐条输出【通过/不通过+依据】，最后输出 JSON 结论文档。不凭空猜测身份，"
         "能看清什么就诚实说什么。")

INSTRUCTION = (
    "请质检一张用于抠图的职业 NPC 全身立绘 PNG（768x1024，纯黑背景）。\n\n"
    "【正式设定】\n{setting}\n\n"
    "判据（只判以下三类，其余一律不算缺陷）：\n"
    "1) 对象符合设定：主体身份与服饰/姿态是否与【正式设定】一致。\n"
    "2) 背景：主体之外的区域是否大体为接近平整漆黑的背景，无明显杂散物体、无大面积亮斑/白雾/网格；"
    "（注意：背景可为轻微暗灰噪点，属正常；不要求绝对纯黑。主体脚下的少量黑隙可接受，不算缺陷。）\n"
    "3) 主体完整：从头到脚全身都在画面内（可接受脚底被底缘轻裁切或脚底留少量黑隙），"
    "四肢/五官/姿态/服装关键特征完整、不残缺、不畸形、不多肢少肢。\n"
    "4) 边缘：1-2 像素的抗锯齿过渡边属正常；重点检查有无大面积白色描边向外溢出、白色光晕、"
    "或主体轮廓周围大片杂散亮白噪点污染背景。\n\n"
    "输出 JSON：{{\"pass\": bool, \"verdict\": \"PASS|FAIL|RETRY\", \"scores\": "
    "{{\"object\":0-1,\"bg\":0-1,\"complete\":0-1,\"edges\":0-1}}, \"defects\":[具体缺陷]}}"
)


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r"TOKENRHYTHM_API_KEY:\s*[\"']?([^\"'\r\n]+)", t)
    return m.group(1).strip() if m else ""


def to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def ask(path, slug, retries=15):
    key = get_key()
    du = to_data_url(path)
    setting = SETTING.get(slug, slug)
    user = INSTRUCTION.format(setting=setting)
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": RULES},
            {"role": "user", "content": [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": du}},
            ]},
        ],
        "max_tokens": 3000,
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
                time.sleep(15)
                continue
            jm = re.search(r"\{.*\}", content, re.DOTALL)
            js = jm.group(0) if jm else content
            return js, content
        except urllib.error.HTTPError as e:
            code = e.code
            em = e.read().decode(errors="replace")[:300]
            print("attempt %d HTTP %d: %s" % (attempt, code, em), flush=True)
            if code == 429:
                time.sleep(15)
                continue
            if code >= 500:
                time.sleep(min(15 + attempt * 5, 60))
                continue
            time.sleep(8)
        except Exception as ex:
            print("attempt %d err: %s" % (attempt, ex), flush=True)
            time.sleep(10)
    return None, "QC_ERROR"


if __name__ == "__main__":
    img, slug, out_md = sys.argv[1], sys.argv[2], sys.argv[3]
    js, raw = ask(img, slug)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC NPC: %s\n\n**文件**: `%s`\n\n" % (slug, img))
        f.write("**设定**: %s\n\n" % SETTING.get(slug, slug))
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    verdict = "PASS" if (js and '"pass": true' in js) else ("FAIL" if js else "ERROR")
    print("QC %s verdict=%s -> %s" % (slug, verdict, out_md), flush=True)
    sys.exit(0 if verdict == "PASS" else 1)
