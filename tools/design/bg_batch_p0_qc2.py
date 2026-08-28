# -*- coding: utf-8 -*-
"""bg_batch_p0_qc2.py — 用 qwen3.7-flash(不带 tokenrhythm/ 前缀, OpenAI 兼容)
对 raw_bg_batch_p0/ 下指定 bg 做"空镜"质检(raw_bg 判据: 无人物无人形无生物 / 符合设定氛围 /
无文字水印logo / 无畸变)。

用法: D:\\AI_Tools\\ComfyUI\\python_embeded\\python.exe bg_batch_p0_qc2.py <name1> [name2 ...]
不传参数则质检全部。
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_bg_batch_p0")
QC = os.path.join(RAW, "qc")
URL = "https://tokenrhythm.studio/v1/chat/completions"
CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
MODEL = "qwen3.7-flash"

EXPECT = {
    "bs_bg_airport": "现代机场候机厅空镜，冷白光，空旷无人，灾难前宁静",
    "bs_bg_highway": "深夜高速公路空镜，墨黑夜空，路灯昏黄，雨湿路面，车祸前寂静",
    "bs_bg_mall": "商厦中庭空镜，玻璃穹顶，冷青色调，扶梯与锈蚀货梯，荒凉无人",
    "bs_bg_cinema": "影院逃生楼梯间空镜，暗红警报光与火苗烟雾，昏暗压抑，无可读标识",
    "xingjichuanqi2_bg_mine": "废弃煤矿洞空镜，灰雾弥漫，矿车轨道，昏黄矿灯，无人",
    "xingjichuanqi2_bg_hospital": "老式医院走廊空镜，冷绿荧光灯，斑驳墙皮，纯寂静无人无字",
    "jialebi_bg_deck": "海盗船木制甲板空镜，帆布缆绳，海景晚天，无人无飞鸟",
    "jialebi_bg_cove": "加勒比沉船湾空镜，半沉海盗船残骸搁浅礁湾，无人",
    "shenghua3_bg_underground": "浣熊市地下污水管网空镜，昏黄应急灯暖色调，锈管污水，无人",
    "shenghua3_bg_lab": "生物实验室孵化舱空镜，玻璃培养舱幽绿荧光，冷白光，无人",
    "jishujing_bg_boiler": "梦境锅炉房空镜，巨大铸铁炉与蒸汽，炉火，无人",
    "jishujing_bg_highschool": "荒废高中教室走廊空镜，储物柜与冷光，完全无文字无标牌",
}

RULES = (
    "1)空镜：绝对无人物/无人形/无生物（含远处飞鸟、人形图案、假人模特、EXIT小人标）；"
    "2)与期望场景/色调氛围相符；3)空间开阔构图合理；4)无文字/无水印/无logo/无标牌/无明显字迹；"
    "5)无明显畸变/糊图"
)

def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        t = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', t)
    return m.group(1).strip() if m else ""

def b64_data(p):
    with open(p, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def call(img, desc):
    key = get_key()
    data_url = b64_data(img)
    text = (
        "你是素材空镜质检员。给出一张背景图，判断是否合格。\n"
        "期望画面: " + desc + "\n"
        "判据: " + RULES + "\n"
        "逐项简短说明，最后给一行结论【PASS】或【FAIL+具体原因】。"
    )
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": text},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]}],
        "max_tokens": 4000,
    }
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=240) as r:
                resp = json.loads(r.read().decode())
            msg = resp["choices"][0]["message"]
            out = msg.get("content") or msg.get("reasoning_content") or "(empty)"
            return out
        except urllib.error.HTTPError as e:
            code = e.code
            print("  attempt %d HTTP %d" % (attempt, code), flush=True)
            if code == 429:
                time.sleep(15); continue
            if attempt >= 5:
                return "QC_ERROR HTTP %d" % code
            time.sleep(8)
        except Exception as e:
            print("  attempt %d err %s" % (attempt, e), flush=True)
            if attempt >= 5:
                return "QC_ERROR %s" % e
            time.sleep(8)
    return "QC_ERROR"

def verdict_from(out):
    tail = out[-80:]
    return "PASS" if ("PASS" in tail or "【PASS】" in tail) and "FAIL" not in tail else "FAIL"

def main():
    names = sys.argv[1:] or list(EXPECT.keys())
    os.makedirs(QC, exist_ok=True)
    res = {}
    for name in names:
        img = os.path.join(RAW, name + ".png")
        if not os.path.exists(img):
            print("MISSING", name, flush=True); res[name] = "MISSING"; continue
        out = call(img, EXPECT.get(name, name))
        verdict = verdict_from(out)
        res[name] = verdict
        with open(os.path.join(QC, name + ".md"), "w", encoding="utf-8") as f:
            f.write(out)
        print("QC", name, "->", verdict, flush=True)
    print("=== QC2 SUMMARY ===", flush=True)
    for k, v in res.items():
        print(k, v, flush=True)

if __name__ == "__main__":
    main()
