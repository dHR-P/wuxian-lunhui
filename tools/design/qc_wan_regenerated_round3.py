# -*- coding: utf-8 -*-
"""qc_wan_regenerated_round3.py — wan 轮6(guard_wan3/zombie_wan3) + hunter_wan3_cut_final 复检
调 qwen3.7-flash 识图。用法: <comfy-python> qc_wan_regenerated_round3.py
"""
import base64
import json
import os
import re
import time
import urllib.request
import urllib.error

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
URL = "https://tokenrhythm.studio/v1/chat/completions"
BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"

SHEET = [
    ("guard_wan3",
     "穿着防暴装备/制服的人类守卫(guard): 黑色防暴甲、战术背心、肩甲, 持防暴盾与短棍, 立姿警戒, 非丧尸非主角 (a human guard in full riot gear: black riot armor vest, shoulder pauldrons, holding a riot shield and short baton, standing alert guard stance; NOT a zombie, not the protagonist).",
     "tools/design/raw_enemy/guard_wan3.png", "tools/design/cutout_out/guard_wan3_cut.png",
     "⚠第3轮已强化『裤腿/大腿/小腿布料受冷白主光均匀照亮、高对比不融黑』。请重点核实: 下半身(裤腿/腿/靴防暴甲)是否明亮清晰、不融进纯黑背景; 轮廓是否有白/浅蓝描边残留; 是否有镂空/碎点。"),
    ("zombie_wan3",
     "腐坏人类丧尸(zombie): 破烂染血衣物、灰白腐皮、伤口可见, 直立踉跄行走, 恐怖但可辨识, 非守卫非主角 (a decayed rotting human zombie: torn ragged clothing, gray rotten skin, shambling upright hunched pose, recognizably undead; NOT a guard, not the protagonist).",
     "tools/design/raw_enemy/zombie_wan3.png", "tools/design/cutout_out/zombie_wan3_cut.png",
     "⚠第3轮改为『灰蓝灰色调、边缘暗实边贴黑底、无任何亮色外框』(前两代白描边顽固)。请重点核实: 全身轮廓是否仍有白/浅色描边或贴纸感; 背景纯黑; 轮廓平滑抗锯齿。"),
    ("hunter_wan3(cutout复检)",
     "无皮肤肌肉怪兽(hunter): 灰棕肌肉块面、无衣物、左右爪刃、低重心扑击, 非人类 (a skinless muscular monster, pale gray-brown muscle blocks, no clothing, claw+blade, low-center hunting pose; NOT human).",
     "tools/design/raw_enemy/hunter_wan3.png", "tools/design/cutout_out/hunter_wan3_cut_final.png",
     "⚠这是修补后 cutout 复检(已去离体碎点与左缘噪点)。raw 上轮判可发布。请重点核实 cutout: 背景全透明、主体为一连通完整体型(注意:无衣物肌肉怪物体型在臂-躯凹陷处是实体肌肉,非镂空)、无白/黑边残留、无碎点、轮廓干净; 并复核 raw 无白描边/下半身明亮。"),
]

CRITERIA = (
    "请分别对【原始立绘 RAW】与【抠图切割图 CUTOUT】各逐条判定以下7点:\n"
    "1. 全身完整无裁剪(头顶/双手/脚完整; 脚可被画面底缘轻微裁切)\n"
    "2. 背景是否绝对平面纯黑, 无反射/投影/渐变/光晕\n"
    "3. 脚掌贴近画面底缘, 下方留白小\n"
    "4. 轮廓上是否有白色描边/白边残留/白或浅蓝边缘光晕\n"
    "5. 双手可见且手指清晰分离; (hunter) 爪/刀清晰分离、不糊\n"
    "6. 下半身是否明亮清晰、不融进黑背景(hunter 尤其无黑剪影; guard 尤其防暴甲/裤腿下半身)\n"
    "7. cutout: 背景全透明、主体完整无镂空大洞、无白边/黑边残留、无碎点杂质、轮廓干净平滑\n"
)


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def call_qwen(subject_note, prenote, raw, cut):
    key = get_key()
    text = ("你是一位资深游戏美术质检员。请逐项核验这个角色立绘(设定: %s)。%s\n\n%s\n"
            "最终请给出: 每张图的 raw 判定(可发布/需重生成)与 cutout 判定, 以及合成最终判定与修正建议(若有)。"
            % (subject_note, prenote, CRITERIA))
    msgs = [{"role": "user", "content": [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(raw)}},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(cut)}},
    ]}]
    body = json.dumps({"model": "qwen3.7-flash", "messages": msgs, "max_tokens": 4000}).encode()
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read().decode())
            return "OK", resp
        except urllib.error.HTTPError as e:
            code = e.code
            detail = e.read().decode(errors="replace")[:200]
            if code == 429:
                time.sleep(15)
                continue
            if code == 504 and attempt == 1:
                time.sleep(5)
                continue
            if attempt >= 5:
                return "FAIL HTTP%d %s" % (code, detail), None
            time.sleep(5)
        except Exception as e:
            if attempt >= 5:
                return "FAIL %s" % e, None
            time.sleep(5)
    return "FAIL", None


def main():
    out_path = os.path.join(BASE, "tools", "design", "qc_wan_round3_result.txt")
    buf = []
    for (id_name, subj, raw, cut, prenote) in SHEET:
        raw_p = os.path.join(BASE, raw)
        cut_p = os.path.join(BASE, cut)
        if not (os.path.exists(raw_p) and os.path.exists(cut_p)):
            line = "===== %s :: MISSING (%s / %s)" % (id_name, raw_p, cut_p)
            print(line, flush=True); buf.append(line); continue
        status, resp = call_qwen(subj, prenote, raw_p, cut_p)
        buf.append("===== %s :: %s" % (id_name, status))
        print("===== %s :: %s" % (id_name, status), flush=True)
        if resp and resp.get("choices"):
            m = resp["choices"][0].get("message", {})
            parts = []
            for k in ("content", "reasoning_content"):
                v = m.get(k, "") or ""
                if isinstance(v, str) and v.strip():
                    parts.append("%s: %s" % (k, v))
                elif v:
                    parts.append("%s: %s" % (k, json.dumps(v, ensure_ascii=False)))
            buf.append("\n".join(parts)[:8000])
            buf.append("---usage: %s" % json.dumps(resp.get("usage", {}), ensure_ascii=False))
        else:
            buf.append("(no valid choice)")
        buf.append("")
        print("progress %s done" % id_name, flush=True)
        time.sleep(2)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(buf))
    print("ALLDONE -> %s" % out_path, flush=True)


if __name__ == "__main__":
    main()