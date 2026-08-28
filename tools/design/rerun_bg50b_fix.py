# -*- coding: utf-8 -*-
"""rerun_bg50b_fix.py — 针对批2 FAIL 的 miwu/lanshan 做定向重做 + 复检。
目标修因: miwu=商店招牌乱码文字; lanshan=半兽人军阵过于清晰挡前景(违反空镜)。
仍用 wan2.7-image 生成 + glm-5.3-flash 复检, 至多各2次。
Usage: comfy_python rerun_bg50b_fix.py
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_50bg2")
sys.path.insert(0, BASE)
from gen_wan import gen

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
CHAT_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "glm-5.3-flash"

FIXES = [
    ("miwu", "迷雾",
     "超市停车场浓雾空镜, 厚重的白色雾墙吞没远处一切, 近景空荡无人, 一排车尾灯在浓雾中晕开温暖光晕, "
     "没有任何店铺招牌/无任何文字标识/无字母/无logo, 只有雾、路灯轮廓与车辆车灯, 潮湿冷漠, 空镜, 无人物"),
    ("lanshan", "蓝山",
     "孤山要塞远景大空镜, 山巅石筑城墙堡垒占据前景画面主体, 山脚平原上极远处一团模糊灰暗的军阵剪影被薄雾笼罩, "
     "没有清晰盔甲细节, 仅仅是遥远天际线上的暗色群体轮廓, 旌旗模糊, 压迫阴沉黄昏, 无近景人物, 无文字"),
]

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""

def b64(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode()

def qc_call(payload):
    key = get_key()
    req = urllib.request.Request(CHAT_URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer "+key})
    for a in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429,503,502,504,500):
                time.sleep(15*(a+1)); continue
            raise
        except Exception:
            time.sleep(10)
    raise RuntimeError("qc exhausted")

def qc_image(p, desc):
    data_url = "data:image/png;base64," + b64(p)
    text = ("你是副本场景空镜bg质检员, 只输出中文, 判断是否合格。\n期望: "+desc+"\n"
            "判据: 1)空镜, 前景绝无清晰人物/角色/生物特写(远景极模糊剪影可容忍); "
            "2)符合场景/色调/氛围; 3)构图开阔无畸变; 4)无任何文字/字母/乱码/水印/logo.\n"
            "逐项说明, 最后一行仅: PASS 或 FAIL(具体原因)。")
    payload = {"model": QC_MODEL, "messages": [{"role":"user","content":[
        {"type":"text","text":text},
        {"type":"image_url","image_url":{"url":data_url}}]}], "max_tokens":4000}
    resp = qc_call(payload)
    msg = resp["choices"][0]["message"]
    out = msg.get("content") or msg.get("reasoning_content") or ""
    v = "PASS" if ("FAIL" not in out[-60:] and "PASS" in out[-60:]) else "FAIL"
    return v, out

def main():
    qd = os.path.join(BASE, "qc_bg50b"); os.makedirs(qd, exist_ok=True)
    report = []
    for idx,(slug,name,prompt) in enumerate(FIXES,1):
        out = os.path.join(RAW, "%s_bg.png" % slug)
        verdict = "FAIL"
        for a in range(1,3):
            ok = gen(prompt, "768x1024", out)
            if not ok:
                print("[%d] %s gen fail a%d"%(idx,slug,a), flush=True); continue
            time.sleep(1)
            v, txt = qc_image(out, name+":"+prompt)
            with open(os.path.join(qd,"%s_fix_qc_a%d.md"%(slug,a)),"w",encoding="utf-8") as f:
                f.write(txt)
            print("[%d] %s fix a%d QC=%s"%(idx,slug,a,v), flush=True)
            if v=="PASS":
                verdict="PASS"
                with open(os.path.join(RAW,"%s.done"%slug),"w",encoding="utf-8") as f:
                    f.write("PASS(第二次定向重做)")
                break
        note="".join(c if ord(c)<0x2100 else "" for c in txt[:200])
        report.append("- %s(%s): **%s** - 定向重做复检: %s"%(name,slug,verdict,note))
        print("== %s %s"%(slug,verdict), flush=True)
    # append to main log under a fix section
    lf = os.path.join(BASE, "bg_50_assets2_log.md")
    with open(lf,"a",encoding="utf-8") as f:
        f.write("\n## 定向重做复检(miwu/lanshan)\n\n")
        for r in report:
            f.write(r+"\n")
        f.write("\n")
    print("FIX_REPORT_APPENDED", flush=True)

if __name__=="__main__":
    main()