# -*- coding: utf-8 -*-
"""qc_wan_finalcut.py — 对修补后的 hunter_wan3_cut_final_v3 与 pc_wan5_cut 做 qwen3.7-flash 独检。"""
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


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def call(subj, prenote, raw, cut):
    text = (
        "你是资深游戏美术质检员,核验这个角色立绘的RAW与CUTOUT(设定:%s)。%s\n\n"
        "请对RAW与CUTOUT各逐条判定7点:1全身完整无裁剪 2背景绝对平面纯黑无反射投影渐变光晕 "
        "3脚掌贴近底缘留白小 4轮廓有无白/浅蓝描边光晕 5双手手指/爪刀清晰分离 6下半身明亮不融黑 "
        "7cutout:背景全透明、主体完整无镂空、无白黑边、无碎点、轮廓干净。\n"
        "最终给 raw 判定与 cutout 判定及合成最终判定与修正建议。" % (subj, prenote)
    )
    msgs = [{"role": "user", "content": [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(raw)}},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64(cut)}},
    ]}]
    body = json.dumps({"model": "qwen3.7-flash", "messages": msgs, "max_tokens": 4000}).encode()
    for a in range(1, 6):
        try:
            req = urllib.request.Request(URL, data=body, headers={
                "Authorization": "Bearer " + get_key(), "Content-Type": "application/json"})
            resp = json.loads(urllib.request.urlopen(req, timeout=180).read().decode())
            return resp
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(15)
                continue
            if e.code == 504 and a == 1:
                time.sleep(5)
                continue
            if a >= 5:
                return None
            time.sleep(5)
        except Exception:
            if a >= 5:
                return None
            time.sleep(5)
    return None


def main():
    out = []
    items = [
        ("hunter_wan3_cut_final_v3",
         "无皮肤肌肉怪兽,灰棕肌肉,无衣物,左爪右刀,低重心扑击,非人类",
         "这是修补后的抠图(hunter_wan3_cut_final_v3):已把左臂-躯干间被包围的纯黑背景空隙掏成透明(该区RAW实为黑背景空隙非肌肉)。请重点核实cutout:背景全透明、主体连通、臂-躯空隙是否已透明无黑残、无白黑边、无碎点、轮廓干净;并复核 raw(无白描边/下半身明亮)是否仍合格。",
         "raw", "cut_hunter"),
        ("pc_wan5_cut",
         "健康亚洲青年男性战士(郑吒),深灰蓝T恤+深色战术裤,站姿握拳,非丧尸",
         "这是抠图(pc_wan5_cut)。前份质检提到头顶头发似被抠。请重点核实cutout头部/头顶是否完整无洞无噪点,并照常判定其余判据。",
         "raw", "cut_pc"),
    ]
    pathmap = {
        "raw": os.path.join(BASE, "tools/design/raw_enemy/"),
        "cut_hunter": os.path.join(BASE, "tools/design/cutout_out/hunter_wan3_cut_final_v3.png"),
        "cut_pc": os.path.join(BASE, "tools/design/cutout_out/pc_wan5_cut.png"),
    }
    for name, subj, prenote, rawkey, cutkey in items:
        # rawkey is "raw", need the correct raw file per item
        rawf = "hunter_wan3.png" if "hunter" in name else "pc_wan5.png"
        resp = call(subj, prenote, os.path.join(pathmap["raw"], rawf), pathmap[cutkey])
        out.append("===== %s :: %s" % (name, "OK" if resp else "FAIL"))
        if resp and resp.get("choices"):
            m = resp["choices"][0].get("message", {})
            for k in ("content", "reasoning_content"):
                v = m.get(k, "") or ""
                out.append("%s: %s" % (k, v[:3000] if isinstance(v, str) else json.dumps(v, ensure_ascii=False)[:3000]))
        out.append("")
        print("progress %s done" % name, flush=True)
        time.sleep(2)
    outp = os.path.join(BASE, "tools/design/qc_wan_finalcut_result.txt")
    with open(outp, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("ALLDONE -> " + outp)


if __name__ == "__main__":
    main()