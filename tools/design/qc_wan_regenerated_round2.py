# -*- coding: utf-8 -*-
"""qc_wan_regenerated_round2.py — 对 wan 轮5(pc_wan5/guard_wan2/zombie_wan2/hunter_wan3-final)
调 qwen3.7-flash 识图质检(raw+cutout)。用法: <comfy-python> qc_wan_regenerated_round2.py
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
    ("pc_wan5",
     "健康亚洲青年男性战士(主角郑吒), 深灰蓝紧身T恤+深色战术裤, 正常人类战士站姿握拳, 非丧尸非变异 (a healthy Asian young man warrior: dark grayish-blue fitted T-shirt, dark cargo pants, normal human battle stance, NOT a zombie, NOT mutated).",
     "tools/design/raw_enemy/pc_wan5.png", "tools/design/cutout_out/pc_wan5_cut.png",
     "⚠本轮已据上轮底部地面反光缺陷改 prompt(脚下虚空无地面无地板无反射无渐变)。当前底部角落已呈纯黑(lum≈9-10)。请重点核实: 背景绝对平面纯黑、无任何地面反光/渐变/光晕。"),
    ("guard_wan2",
     "穿着防暴装备/制服的人类守卫(guard): 黑色防暴甲、战术背心、肩甲, 持防暴盾与短棍, 立姿警戒, 非丧尸非主角 (a human guard in full riot gear: black riot armor vest, shoulder pauldrons, holding a riot shield and short baton, standing alert guard stance; NOT a zombie, not the protagonist).",
     "tools/design/raw_enemy/guard_wan2.png", "tools/design/cutout_out/guard_wan2_cut.png",
     "⚠本轮已据上轮『黑色防暴甲下半身融黑背景』缺陷强化 prompt(全身装备尤其裤腿/下躯干受冷白主光均匀照亮、任何部位不得与背景同色)。请重点核实: 下半身(裤腿/腿/靴)是否明亮清晰、不融进纯黑背景; 无白描边。"),
    ("zombie_wan2",
     "腐坏人类丧尸(zombie): 破烂染血衣物、灰白腐皮、伤口可见, 直立踉跄行走姿态, 恐怖但可辨识, 非守卫非主角 (a decayed rotting human zombie: torn blood-stained ragged clothing, grayish rotten skin, shambling upright hunched pose, recognizably undead; NOT a guard, not the protagonist).",
     "tools/design/raw_enemy/zombie_wan2.png", "tools/design/cutout_out/zombie_wan2_cut.png",
     "⚠本轮已据上轮『粗白描边』缺陷强化绝对否定(no border/no outline/no white edge/no outline highlight, clean flat silhouette)。请重点核实: 全身轮廓是否有任何白色/浅色描边/光晕残留; 背景纯黑; 轮廓平滑抗锯齿。"),
    ("hunter_wan3",
     "无皮肤肌肉怪兽(hunter撕裂者): 灰棕肌肉块面、无衣物、左手巨大钩/刀爪、右手刀形骨刃、低重心扑击猎杀姿态, 非人类 (a skinless muscular monster: pale gray-brown muscle blocks, no clothing, huge claw blade on left hand, sharp blade on right hand, low-center lunging hunting pose, NOT human).",
     "tools/design/raw_enemy/hunter_wan3.png", "tools/design/cutout_out/hunter_wan3_cut_final.png",
     "⚠raw 上轮已判可发布。本轮只提交修补后的 cutout(hunter_wan3_cut_final, 已去除左臂-躯干封闭空隙处杂点、剥离全部离体碎点、清掉左侧边缘噪点)。请重点核实 cutout: 背景全透明、主体仅一个完整连通体、无白边/黑边残留、无碎点、轮廓干净; 同时复核 raw 仍合格(无白描边/下半身明亮)。"),
]

CRITERIA = (
    "请分别对【原始立绘 RAW】与【抠图切割图 CUTOUT】各逐条判定以下7点:\n"
    "1. 全身完整无裁剪(头顶/双手/脚完整; 脚可被画面底缘轻微裁切)\n"
    "2. 背景是否绝对平面纯黑, 无反射/投影/渐变/光晕\n"
    "3. 脚掌贴近画面底缘, 下方留白小\n"
    "4. 轮廓上是否有白色描边/白边残留/白或浅蓝边缘光晕\n"
    "5. (pc_wan5/guard/zombie)双手可见且手指清晰分离; (hunter) 爪/刀清晰分离、不糊不融合\n"
    "6. 下半身(腿/脚/下躯干)是否明亮清晰、不融进黑背景(hunter 尤其无黑剪影; guard 尤其防暴甲下半身)\n"
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
    text = ("你是一位资深游戏美术质检员。请逐项核验这个角色立绘的原始RAW与抠图CUTOUT(设定: %s)。\n\n%s\n\n%s\n"
            "最终请给出: 每张图的 raw 判定(可发布/需重生成)与 cutout 判定, 以及每张图的合成最终判定与修正建议(若有)。"
            % (subject_note, prenote, CRITERIA))
    msgs = [{"role": "user", "content": [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(raw)}},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(cut)}},
    ]}]
    body = json.dumps({"model": "qwen3.7-flash", "messages": msgs, "max_tokens": 4000}).encode()
    last_err = ""
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
            last_err = "HTTP %d %s" % (code, detail)
            if code == 429:
                time.sleep(15)
                continue
            if code == 504 and attempt == 1:
                time.sleep(5)
                continue
            if attempt >= 5:
                return "FAIL " + last_err, None
            time.sleep(5)
        except Exception as e:
            last_err = str(e)
            if attempt >= 5:
                return "FAIL " + last_err, None
            time.sleep(5)
    return "FAIL " + last_err, None


def main():
    out_path = os.path.join(BASE, "tools", "design", "qc_wan_round2_result.txt")
    buf = []
    for (id_name, subj, raw, cut, prenote) in SHEET:
        raw_p = os.path.join(BASE, raw)
        cut_p = os.path.join(BASE, cut)
        if not (os.path.exists(raw_p) and os.path.exists(cut_p)):
            line = "===== %s :: MISSING FILE (%s / %s)" % (id_name, raw_p, cut_p)
            print(line, flush=True)
            buf.append(line)
            continue
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
            joined = "\n".join(parts)[:8000]
            buf.append(joined)
            buf.append("---usage: %s" % json.dumps(resp.get("usage", {}), ensure_ascii=False))
        else:
            buf.append("(no valid choice in response)")
        buf.append("")
        print("progress %s done" % id_name, flush=True)
        time.sleep(2)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(buf))
    print("ALLDONE -> %s" % out_path, flush=True)


if __name__ == "__main__":
    main()