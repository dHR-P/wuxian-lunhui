# -*- coding: utf-8 -*-
"""run_bg50b.py — batch-2 15 dungeons scene backgrounds (raw_50bg2).
Generates via wan2.7-image (gen_wan.gen), QCs via glm-5.3-flash (glm_qc modal),
retries prompt on QC/API FAIL (<=2).
回避并行代理负责的寂静岭/星际传奇/寄生前夜/猛鬼街/死雾镇/沉没神殿/函谷关/低纬度/
无尽森林/星辰吞噬者/银色战争/天网 这12个。本批为15个不同副本。
Usage: D:\\AI_Tools\\ComfyUI\\python_embeded\\python.exe run_bg50b.py
Outputs raw_50bg2/<slug>_bg.png; log to bg_50_batch2_log.md
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_50bg2")
os.makedirs(RAW, exist_ok=True)
sys.path.insert(0, BASE)

from gen_wan import gen

# ---- wells an (prompts must be FOREGROUND productive empties, no humanoid) ----
TASKS = [
    ("xinhuangfang", "心慌方CUBE",
     "冷白色长方体立方体迷宫室内空镜, 无门无窗, 无数荧光管沿着金属墙体表面排列, 幽冷蓝白色荧光, 中央走廊透视延伸, 干净利落的几何科幻空间, 空无一人, 无人物, 无明显畸变, 电影感静物景观"),
    ("huanxiongshi", "生化浣熊市",
     "末日城市街道空镜, 燃烧的废弃车辆与瓦砾, 远处浓烟中隐约模糊人影剪影, 前景空荡无人, 倾斜的路灯, 暗红与灰黑色调, 灾难氛围, 空镜场景描绘, 无文字无水印"),
    ("shuangbai", "霜白村",
     "雪夜村庄空镜, 覆盖白雪的居民房屋, 一座枯井, 灰色浓雾初起在村道间弥漫, 冷蓝暗色调, 寂静压抑的雪景, 空无一人, 空镜, 无人物, 无文字"),
    ("dashengtang", "大教堂",
     "哥特式大教堂内部空镜, 高耸穹顶与彩色玻璃窗, 自上而下的圣光柱射入, 空气中漂浮的灰尘颗粒, 隐约的圣物与烛台, 庄严肃穆神秘氛围, 空无一人, 空镜, 无文字"),
    ("daliexi", "大裂隙",
     "大地裂口深渊空镜, 巨大的地裂深不见底, 灰色雾气从裂口升腾, 断崖边缘碎岩, 荒芜灰暗大地, 天色阴沉, 壮阔的灾难地貌, 空无一人, 无人物, 无文字"),
    ("poxu", "武极境破虚",
     "武道尽头的高天空镜, 悬浮于云海之上的破碎虚空, 空间中巨大的裂隙反射异界光芒, 蓝紫与金辉光泄, 浮石与残碑, 幻境般超凡场景, 空无一人, 无人物, 无文字"),
    ("panbu", "盘部落",
     "原始部落茅屋群夜景空境, 成排圆锥形茅草屋, 夜色中篝火与火把摇曳, 一道坠落圣遗火光从天空划落, 橙红与墨黑色调, 原始神秘氛围, 空无一人, 无人物, 无文字"),
    ("sanlian", "三联盟",
     "会盟宴席大厅空镜, 长条宴桌上摆满杯盏, 脚下祭坛刻满发光符文, 火把与暗色帷幔, 暗藏杀机的冷峻氛围, 空荡无人, 低机位构图, 中国古风宴会场景, 无人物, 无文字"),
    ("yizhong", "异种",
     "外星基因实验室空镜, 环形玻璃舱并列, 舱内悬着半透明的异种茧, 幽绿与冰蓝冷光, 有机粘液与金属管线, 压抑的科幻生物研究所, 空无一人, 无人物, 无文字"),
    ("miwu", "迷雾",
     "超市停车场浓雾空镜, 厚重雾墙吞没远处建筑, 一排车灯在雾中晕开温暖光晕, 荧光招牌灯光氤氲, 潮湿冷漠气氛, 空荡无人, 空镜, 无人物, 无文字"),
    ("nuoya", "诺亚",
     "巨舰方舟停靠码头待启航前, 白昼天色压抑灰沉, 巨型舰体与码头缆桩, 海面波光, 空旷码头空镜, 未见登船人群, 灾难前兆的死寂氛围, 无人物, 无文字"),
    ("lanshan", "蓝山",
     "孤山要塞远景空镜, 山巅石筑城墙堡垒, 山下平原黑压压的半兽人军阵剪影聚集, 旌旗与尘烟, 被围城前的压迫感, 黄昏冷光, 无近景人物, 无文字"),
    ("shourongsuo", "收容所",
     "收容设施干净走廊空镜, 白色瓷砖墙面, 顶灯冷白照明, 墙壁上概念污染形成的扭曲光斑条纹, 尽头的封闭金属门, 冰冷压抑的超自然设施, 空无一人, 无人物, 无文字"),
    ("xingjijianchuan", "星际舰船",
     "巨型星际舰内部空镜, 机甲停机甲板上矗立庞大机械体, 一整面深空舷窗透出星辰银河, 工业管线与指示灯, 硬科幻载具库房, 空无一人, 无人物, 无文字"),
    ("tiexue2", "铁血AVP",
     "雨林地下金字塔空镜, 狭窄通道石壁刻满异形浮雕图腾, 地面残留酸液腐蚀痕迹, 顶部石灯冷光, 湿热异域恐惧氛围, 空无一人, 无人物, 无文字"),
]

# ---- glm QC modal ----
CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
CHAT_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "glm-5.3-flash"


def get_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def qc_call(payload):
    key = get_key()
    req = urllib.request.Request(CHAT_URL, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + key})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502, 504, 500):
                time.sleep(15 * (attempt + 1)); continue
            raise
        except Exception:
            time.sleep(10)
    raise RuntimeError("qc retries exhausted")


def qc_image(path, desc):
    data_url = "data:image/png;base64," + b64(path)
    text = ("你是副本场景空镜 bg 素材质检员, 只输出中文。判断下面这张图是否合格。\n"
            "期望画面: " + desc + "\n"
            "判据(空镜bg): 1)空镜, 绝对无人物无角色无人形无生物主体(远处极模糊群体剪影可容忍, "
            "但前景不得有人形/半兽人等具体角色特写); 2)与期望场景/色调/氛围相符; "
            "3)开阔环境空间感, 构图合理无畸变; 4)无文字/无水印/无logo/无乱码.\n"
            "逐项简短说明, 最后给一行明确结论: 只有 PASS(合格) 或 FAIL(不合格+具体原因), 二选一。")
    payload = {"model": QC_MODEL,
               "messages": [{"role": "user", "content": [
                   {"type": "text", "text": text},
                   {"type": "image_url", "image_url": {"url": data_url}}]}],
               "max_tokens": 4000}
    resp = qc_call(payload)
    msg = resp["choices"][0]["message"]
    out = msg.get("content") or msg.get("reasoning_content") or "(no content)"
    last = out[-60:]
    verdict = "PASS" if ("FAIL" not in last and "PASS" in last) else "FAIL"
    return verdict, out


def qc_md_dir():
    d = os.path.join(BASE, "qc_bg50b")
    os.makedirs(d, exist_ok=True)
    return d


def run():
    log = []
    cost_total = 0.0
    done = {}
    for idx, (slug, name, base_prompt) in enumerate(TASKS, 1):
        out = os.path.join(RAW, "%s_bg.png" % slug)
        done_marker = os.path.join(RAW, "%s.done" % slug)
        if os.path.exists(done_marker):
            mark = open(done_marker, encoding="utf-8").read().strip() or "PASS"
            print("[resume] %s already done=%s, skip" % (slug, mark), flush=True)
            log.append("- %s(%s): **%s** (resumed, 此前已完成)" % (name, slug, mark))
            continue
        prompt = base_prompt
        result = None
        final_verdict = "FAIL"
        gen_cost = 0.0
        for attempt in range(1, 4):  # 1 initial + up to 2 retries
            if attempt > 1:
                prompt = base_prompt + " 重新构图: 强调纯空镜环境, 前景绝对空旷无人, 加大环境纵深与氛围光线。"
            ok = gen(prompt, "768x1024", out)
            if not ok:
                print("[%d/%d] gen API fail attempt %d" % (idx, len(TASKS), attempt), flush=True)
                result = ("gen_api_fail", "API 生成失败", prompt)
                continue
            time.sleep(1)
            v, qc_txt = qc_image(out, name + "：" + base_prompt)
            qmd = os.path.join(qc_md_dir(), "%s_qc_a%d.md" % (slug, attempt))
            with open(qmd, "w", encoding="utf-8") as f:
                f.write(qc_txt)
            print("[%d/%d] %s attempt%d QC=%s" % (idx, len(TASKS), slug, attempt, v), flush=True)
            result = (v, qc_txt, prompt)
            if v == "PASS":
                final_verdict = "PASS"
                with open(done_marker, "w", encoding="utf-8") as f:
                    f.write("PASS")
                break
        done[slug] = final_verdict
        size = os.path.getsize(out) if os.path.exists(out) else 0
        cost = 0.2 * (1 + (final_verdict == "PASS"))  # est: 1 image + free retry only if needed
        gen_cost = 0.2
        est = 0.2 * 1  # minimal estimate, actual billed via API resp
        line = {
            "slug": slug, "name": name, "verdict": final_verdict,
            "attempts": result[0], "bytes": size, "out": out
        }
        qc_note = result[1][:200].replace("\n", " ") if result else ""
        # strip any unicode symbols unsafe for console/log
        qc_note_ascii = "".join(c if ord(c) < 0x2100 else "" for c in qc_note).strip()
        mdline = "- %s(%s): **%s** - QC: %s" % (name, slug, final_verdict, qc_note_ascii)
        print(mdline, flush=True)
        log.append(mdline)
    raw_log = os.path.join(BASE, "bg_50_batch2_raw.json")
    with open(raw_log, "w", encoding="utf-8") as f:
        json.dump(done, f, ensure_ascii=False, indent=2)
    write_report(log)
    return done


def write_report(log):
    lf = os.path.join(BASE, "bg_50_assets2_log.md")
    lines = []
    lines.append("# 副本场景 bg 批2 生成与质检日志 (bg_50_assets2)")
    lines.append("")
    lines.append("本批 15 张副本场景背景 bg(空镜无人形)。生成模型: wan2.7-image(768x1024); 质检: glm-5.3-flash。")
    lines.append("原始文件存放: `tools/design/raw_50bg2/<slug>_bg.png`(未部署)。")
    lines.append("")
    lines.append("## 单张结果")
    lines.append("")
    for l in log:
        lines.append(l)
    lines.append("")
    lines.append("## 生成/质检说明")
    lines.append("- 构图全部为前景空荡的环境空镜; 丧尸/军阵等可容忍的仅作为远景极模糊群体剪影, 无具体角色特写。")
    lines.append("- 每条按判据逐项检查: 空镜无人形 / 符合设定 / 无文字水印; FAIL 改 prompt 重试 ≤2 次。")
    lines.append("- 花费为估算: 每张成功图约 0.2 元, 重试/API失败另计(以 tokenrhythm 实际账单为准)。")
    lines.append("- 未部署, 未改动任何 .rs/.js/.json。")
    lines.append("")
    with open(lf, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("REPORT_WRITTEN: " + lf, flush=True)


if __name__ == "__main__":
    run()