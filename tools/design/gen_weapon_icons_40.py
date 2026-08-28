# -*- coding: utf-8 -*-
"""gen_weapon_icons_40.py — 为 40 个代表性武器生成图标(纯黑底方形768x768)并质检部署。
流程: gen_wan.py:gen ("768x768") → qwen3.7-flash 质检(纯黑底/无文字/图标清晰) → 合格则部署
到 server-rs/ui/assets/img/item_<weapon_id>.png。每个图标生图失败/质检 FAIL 最多重试 retry 次。
输出: tools/design/weapon_icons_40_log.md
"""
import base64
import io
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_wan import gen  # noqa: E402

STAGE_DIR = os.path.join(HERE, "item_icons", "weapon_stages_40")
os.makedirs(STAGE_DIR, exist_ok=True)

PROJECT_ROOT = os.path.dirname(os.path.dirname(HERE))
DEPLOY_DIR = os.path.join(
    PROJECT_ROOT, "server-rs", "ui", "assets", "img")
os.makedirs(DEPLOY_DIR, exist_ok=True)

LOG_PATH = os.path.join(HERE, "weapon_icons_40_log.md")

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
QC_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "qwen3.7-flash"

MAX_RETRY = 2  # 每个图标生图→质检 最多重试次数

# ---------- 提示词公共前缀(复用经验证的纯黑底图标模板, 强化"无文字/居中/无辉光穿透") ----------
COMMON = (
    "A clean flat 2D game icon of a single weapon rendered on a perfectly uniform pure black "
    "(#000000) background, edge to edge. The weapon sits exactly centered occupying about "
    "65% of the square frame, fully visible, with its whole silhouette inside the frame. "
    "Flat matte stylized rendering with even ambient lighting; all modeling is achieved with "
    "INTERIOR shading and texture only. "
    "CRITICAL — NO RIM LIGHT: the weapon has NO bright white outline, NO white rim, NO white "
    "silhouette stroke, NO glowing edge, NO backlight highlight running along its contour; "
    "the very edge of the weapon fades into plain dark so it terminates cleanly against the "
    "black. "
    "CRITICAL — NO GLOW/BLOOM: the object emits NO glow, NO halo, NO light beam, NO bloom; "
    "the area around the weapon remains absolutely uniform solid black edge to edge, no "
    "gradient, no vignette, no color cast, no reflection on the floor. "
    "NO text, NO letters, NO numbers, NO watermark, NO logo, NO emblem, NO border, NO frame, "
    "NO caption, NO decorative ring. Crisp, clean, professional flat game icon, straight-on "
    "front view. "
    "Item content: "
)

# ---------- 40 个武器清单 (实际 id 取自 server-rs/src/items_data.rs 的 WEAPONS 表) ----------
# 每项: (category, id, 中文名, 英文内容描述)
WEAPONS = [
    # ---- 动漫 8 ----
    ("动漫", "wp_zanjingdao_he", "斩魄刀·卍解",
     "a Japanese zanpakutō katana in bankai form, elegant black katana with a long thin blade, "
     "small tsuba guard, dark wrapped hilt"),
    ("动漫", "wp_excalibur_holy", "誓约胜利之剑",
     "Excalibur, a magnificent western longsword with a golden hilt and glowing pale-blue "
     "blade, cross-guard, radiant holy sword, blade-lit from within without aura"),
    ("动漫", "wp_beam_saber", "光束军刀",
     "a compact lightsaber-style beam saber, short cylindrical metallic hilt emitting a bright "
     "cyan energy blade"),
    ("动漫", "wp_zanyue", "斩月大刀",
     "Zangetsu, a huge cleaver-like Japanese greatsword, wide blade, ragged design, long dark "
     "handle"),
    ("动漫", "wp_qianbenying", "千本樱·散舞",
     "Senbonzakura, a katana with a pink-flowered tsuba, surrounded by scattered pink cherry-"
     "blossom petals as its ability, petals confined to a neat blade shape"),
    ("动漫", "wp_wang_zhicai", "王之财宝·宝具齐射",
     "Gate of Babylon, a golden arcing portal emitting several floating gilded weapons getting "
     "ready to fire, gold treasury vault motif"),
    ("动漫", "wp_guaili_jian", "乖离剑·EA",
     "Ea, the Sword of Rupture, a three-tiered rotating golden sword with cylinder-like segments, "
     "ancient Babylonian relic design"),
    ("动漫", "wp_ruyibang", "如意金箍棒",
     "Ruyi Jingu Bang, a straight golden magic staff-staff with red tassels at both ends, "
     "patterned engraved surface"),

    # ---- 仙侠 8 ----
    ("仙侠", "wp_xuanyuan_jian", "轩辕剑·人皇",
     "Xuanyuan sword, an ancient Chinese bronze sword with guardian-cloud engravings, "
     "antique green-bronze patina, straight double-edged blade"),
    ("仙侠", "wp_pangu_fu", "盘古开天斧",
     "Pangu creation axe, a huge ancient stone-and-bronze battle axe with carved primitive runes, "
     "massive double-bit head on a long wooden haft"),
    ("仙侠", "wp_zhuxian_sijian", "诛仙四剑·合一",
     "four glowing immortals-slaying swords bound together in a fan, each a distinct colored "
     "jade sword, radiant divine energy between them"),
    ("仙侠", "wp_zhanxian_feidao", "斩仙飞刀",
     "a sleek flying dagger with an entangled white spirit-bottle stopper motif, three short "
     "blades, qi channels glowing pale gold"),
    ("仙侠", "wp_fantian_yin", "翻天印",
     "Fantiain seal, a heavy square celestial-print seal topped with a coiled dragon knob, "
     "verdant jade and dark bronze, bottom face carved with formal seal script pattern"),
    ("仙侠", "wp_taiji_tu", "太极图",
     "a taiji mandala, a black-and-white yin-yang disc surrounded by a band of trigram symbols "
     "and flowing qi ribbons, flat emblem style"),
    ("仙侠", "wp_shanhe_shetu", "山河社稷图",
     "a glowing scroll painting used as a planar treasure, an unrolled scroll showing misty "
     "mountains and rivers as a miniature world, floating halo"),
    ("仙侠", "wp_feijian_qingyun", "青云飞剑",
     "a levitating cyan Chinese flying sword, straight slender blade, simple dark basket-"
     "guarded hilt, faint teal qi trail"),

    # ---- 科幻 8 ----
    ("科幻", "wp_gauss_rifle", "高斯步枪",
     "a gauss rail rifle, a sleek sci-fi bullpup rifle with twin electromagnetic coils along "
     "the barrel and a glowing blue charge cell"),
    ("科幻", "wp_particle_cannon", "粒子炮",
     "a heavy particle cannon, a large sci-fi artillery cannon with a wide muzzle and multiple "
     "glowing energy rings on the barrel"),
    ("科幻", "wp_electromag_gun", "电磁加速炮",
     "an electromagnetic railgun, a long sci-fi cannon with parallel acceleration rails and "
     "charging capacitors, static no firing"),
    ("科幻", "wp_plasma_dagger", "等离子刺刃",
     "a plasma dagger, a short combat blade whose white-hot plasma edge is a bright stable "
     "energy line contained along the blade"),
    ("科幻", "wp_antimatter_round", "反物质湮灭弹",
     "an antimatter annihilation warhead, a compact dark sci-fi canister round with warning "
     "chevrons and a single cold violet containment core"),
    ("科幻", "wp_orbital_gun", "轨道天基枪",
     "an orbital space-based laser cannon, a futuristic turret mounted low on a small satellite "
     "housing, dish aperture and heat fins"),
    ("科幻", "wp_laser_sword", "纯激光剑",
     "a pure laser sword, a futuristic hilt emitting a clean straight red energy blade of "
     "uniform brightness, no glow bleed"),
    ("科幻", "wp_nano_blade", "纳米蜂巢剑",
     "a nano-honeycomb sword, a sci-fi blade with a hexagonal lattice nano structure on the "
     "edge, dark metallic cyan tech pattern"),

    # ---- 魔幻 8 ----
    ("魔幻", "wp_shuang_zhi_aisang", "霜之哀伤",
     "Frostmourne, the legendary runeblade, a black rune-inscribed greatsword with a skull, "
     "covered in frost runes and a haunting ice-blue cold glow confined to the blade"),
    ("魔幻", "wp_leidun_chui", "雷神之锤·妙尔尼尔",
     "Mjolnir, Thor's hammer, a heavy square-headed war hammer with a short leather grip, "
     "runes on the head, faint crackling lightning arcs contained to the surface"),
    ("魔幻", "wp_sheng_jian_mj", "光之圣剑",
     "a holy sword of light, an ornate white-gold knightly longsword with a radiant warm "
     "blade, jeweled cross-guard"),
    ("魔幻", "wp_mo_jian_zhl", "诅咒魔剑·噬主",
     "a cursed magic sword, a sinister black blade full of glowing crimson curse-runes with "
     "serrated edges and a demonic eye in the pommel"),
    ("魔幻", "wp_arcan_staff", "奥术增幅法杖",
     "an arcane amplification staff, a tall twisted wood staff crowned with a floating "
     "crystalline gem ring and spiral metal bands"),
    ("魔幻", "wp_madoushu_grimoire", "禁忌魔导书",
     "a forbidden grimoire, a thick dark leather spellbook with a metal clasp and a glowing "
     "arcane eye sigil on the cover, closed"),
    ("魔幻", "wp_xianzhe_zhi_shi", "贤者之石刃",
     "a philosopher's-stone blade, a dagger whose blade is set with a radiant blood-red gem "
     "at the crossguard, ornate gold filigree"),
    ("魔幻", "wp_dragon_lance", "龙枪·屠龙",
     "a dragonlance, a long barbed spear meant to slay dragons, gleaming steel with a large "
     "cross-guard and a red-dragon banner fragment"),

    # ---- 武侠 8 ----
    ("武侠", "wp_yitian_jian", "倚天剑",
     "Yitian sword, an elegant straight Chinese jian sword with a graceful wraparound guard, "
     "supple blade and a tufted hilt, bright polished steel"),
    ("武侠", "wp_tulong_dao", "屠龙宝刀",
     "Tulong sabre, a heavy broad Chinese dao sabre with a wide curved single-edge blade, "
     "large ring pommel carved as a coiled dragon, dark wootz steel"),
    ("武侠", "wp_dagou_bang", "打狗棒·逍遥",
     "a beggar's staff used for the dog-beating stick technique, a smooth wooden staff with "
     "bamboo-joint texture and a leather strap",),
    ("武侠", "wp_xuantie_jian", "玄铁重剑",
     "a heavy dark plain large jian sword made of black zhan iron, thick no-nonsense slab "
     "blade without ornament, heavy and sturdy"),
    ("武侠", "wp_lixiao_feidao", "小李飞刀·例无虚发",
     "a small slender flying dart-knife, a thin needle-like steel throwing blade with a small "
     "guard, deadly accurate unadorned dart"),
    ("武侠", "wp_liumai_jian", "六脉神剑·少商剑",
     "a fingertip qi sword, six slender energy swords fanning out from a hand-off, each a "
     "clean straight line of inner-force energy, contained no bloom"),
    ("武侠", "wp_beiming_jian", "北冥神功·吸星剑",
     "a sword merged with the absorbing northern-darkness art, a sleek jian with a vortex "
     "swirl pattern in the middle of the blade, dark yin aura confined"),
    ("武侠", "wp_dugu_jiujian", "独孤九剑·破剑式",
     "a lone sword of ultimate sword-craft, a plain masterful Chinese jian with minimalist "
     "design, blade shimmering with subtle inner energy, no ornament"),
]

COST_CNY = {"per_image": 0.2}


def get_qc_key():
    with open(CRED, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'TOKENRHYTHM_API_KEY:\s*["\']?([^"\'\r\n]+)', text)
    return m.group(1).strip() if m else ""


def img_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def qc_icon(path, expect):
    """qwen3.7-flash 质检图标(纯黑底/无文字/图标清晰)。返回 (verdict, raw) """
    key = get_qc_key()
    sys_prompt = (
        "你是武器图标质检员。以下给出图标图与期望内容, 请只输出一个 JSON 对象, 不要输出任何解释、推理或代码块。\n"
        "判定口径：\n"
        "1) 背景：图标主体之外的底色应整体为黑色(允许极轻微的近黑噪点/极淡微差忽略)，"
        "但若出现明显的灰/蓝/红渐变、雾、辉光、地板反光、画面感背景则 FAIL。\n"
        "2) 无文字字母数字、无水印、无logo、无边框、无版权标识，出现即 FAIL。\n"
        "3) 主体：清晰可辨、居中、符合期望内容、无残缺/畸形/截断，命中即为 PASS 前提。\n"
        "4) 污染：主体轮廓外一圈完整的白色描边/亮白轮廓/外发光环视为污染判 FAIL；"
        "金属材质自身轮廓内的高光不算污染。\n"
        "输出格式必须严格为："
        "{\"verdict\":\"PASS 或 FAIL\",\"issues\":\"具体问题，无则空串\",\"brief\":\"一句说明\"}"
    )
    user_msg = ("请质检这张武器图标（期望内容：%s）。" % expect)
    body = {
        "model": QC_MODEL,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": user_msg},
                {"type": "image_url", "image_url": {"url": img_data_url(path)}},
            ]},
        ],
        "max_tokens": 2500,
        "temperature": 0.0,
    }
    out = ""
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(QC_URL, data=json.dumps(body).encode(), headers={
                "Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read().decode())
            content = resp["choices"][0]["message"]
            out = content.get("content") or content.get("reasoning_content") or ""
            if out.strip():
                break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(15)
                continue
            if e.code in (500, 502, 503, 504):
                time.sleep(12)
                continue
            out = "ERR: HTTP %d" % e.code
            break
        except Exception as e:
            out = "ERR: %s" % e
            break
    verdict = extract_verdict(out)
    return verdict, out


def extract_verdict(out):
    """从容错文本中稳健提取 PASS/FAIL。优先 JSON, 兜底关键词。"""
    out = out or ""
    # 1) 取所有 JSON 对象(可能多个), 用最后有效的一个
    candidates = []
    for m in re.finditer(r'\{[^{}]*"verdict"[^{}]*\}', out, re.DOTALL):
        try:
            j = json.loads(m.group(0))
            if "verdict" in j:
                candidates.append(str(j["verdict"]).strip().upper())
        except Exception:
            pass
    if candidates:
        v = candidates[-1]
        if "PASS" in v or "FAIL" in v:
            return "PASS" if v == "PASS" else "FAIL"
        return "PASS" if "PASS" in v else "FAIL"
    # 2) 兜底: 找最后出现的 PASS/FAIL 关键字
    if "FAIL" in out or "不通过" in out or "不合格" in out:
        return "FAIL"
    if "PASS" in out or "通过" in out or "合格" in out:
        return "PASS"
    return "ERR"


def main():
    results = []
    raw_lines = []
    for idx, (cat, wid, cname, en_desc) in enumerate(WEAPONS, 1):
        out_name = "item_%s.png" % wid
        final_deploy = os.path.join(DEPLOY_DIR, out_name)
        expect = "%s（%s）" % (cname, wid)
        prompt = COMMON + en_desc
        stage_path = None
        verdict = "FAIL"
        raw = ""
        attempts = 0
        tried = 0
        total_tries = 1 + MAX_RETRY
        while tried < total_tries:
            tried += 1
            attempts = tried
            stage_path = os.path.join(STAGE_DIR, "%02d_%s.png" % (idx, wid))
            print("\n[%d/40] %s %s (%s) gen attempt %d..." % (
                idx, cat, cname, wid, tried), flush=True)
            ok = gen(prompt, "768x768", stage_path)
            if not ok:
                raw = "GEN_FAIL"
                continue
            verdict, raw = qc_icon(stage_path, expect)
            # 质检瞬态错误(ERR)时, 对同一张图重试质检(不浪费下一次生图)
            qc_tries = 1
            while verdict == "ERR" and qc_tries < 4:
                verdict, raw = qc_icon(stage_path, expect)
                qc_tries += 1
            print("  QC verdict=%s  raw=%s" % (verdict, raw[:120]), flush=True)
            if verdict == "PASS":
                break
            # FAIL -> 重试(消耗一次重试次数)
        else:
            verdict = "FAIL"

        pass_flag = (verdict == "PASS")
        if pass_flag and stage_path:
            import shutil
            shutil.copyfile(stage_path, final_deploy)
            print("  DEPLOYED -> %s" % final_deploy, flush=True)
        else:
            final_deploy = None
            print("  RESULT FAIL (verdict=%s, raw=%s)" % (verdict, raw[:80]), flush=True)

        results.append({
            "idx": idx, "category": cat, "weapon_id": wid, "name": cname,
            "status": "PASS" if pass_flag else "FAIL",
            "attempts": attempts, "verdict": verdict, "raw": raw,
            "deployed": final_deploy,
        })
        raw_lines.append((idx, cat, wid, cname, pass_flag, attempts, verdict, raw))

    # ---------- 汇总统计 ----------
    n_pass = sum(1 for r in results if r["status"] == "PASS")
    n_fail = sum(1 for r in results if r["status"] == "FAIL")
    cost = n_pass * COST_CNY["per_image"]
    # 生图调用次数(含重试)近似计费
    total_gen_calls = sum(r["attempts"] for r in results)
    est_cost = total_gen_calls * COST_CNY["per_image"]

    lines = []
    A = lines.append
    A("# 武器图标生成 log (40 个)\n")
    A("\n**工作目录**: `%s`\n" % os.getcwd())
    A("\n**日期**: %s\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
    A("\n## 验收\n")
    A("- 目标: 40 个武器图标(纯黑底方形768×768, 无文字水印, 图标清晰居中)")
    A("- 输送: `gen_wan.py:gen(\"768x768\")` → qwen3.7-flash 质检 → 部署 `server-rs/ui/assets/img/item_<weapon_id>.png`")
    A("- **PASS: %d | FAIL: %d** (≤2 次重试/个)" % (n_pass, n_fail))
    A("- 生图调用次数(含重试): %d → 预估花费: ¥%.2f (0.2元/次)" % (total_gen_calls, est_cost))
    A("- 不碰 .rs (接线后续另做)")

    A("\n## 逐条结果\n")
    A("| # | 类别 | weapon_id | 图标文件 | 中文名 | 结果 | 试次数 | 质检说明 |")
    A("|---|------|-----------|---------|--------|------|--------|----------|")
    for r in results:
        fn = ("item_%s.png" % r["weapon_id"]) if r["deployed"] else "-"
        brief = (r["raw"] or "").replace("\n", " ")[:90]
        verdict_txt = r["verdict"]
        A("| %d | %s | `%s` | `%s` | %s | **%s** | %d | %s |" % (
            r["idx"], r["category"], r["weapon_id"], fn, r["name"],
            r["status"], r["attempts"], verdict_txt))

    A("\n## 部署清单\n")
    A("(部署到 `server-rs/ui/assets/img/`)\n")
    for r in results:
        if r["deployed"]:
            A("- `item_%s.png`  (%s · %s)" % (r["weapon_id"], r["category"], r["name"]))
        else:
            A("- ~~item_%s.png~~ (%s · %s) — **FAIL**" % (r["weapon_id"], r["category"], r["name"]))

    A("\n## 遗留\n")
    if n_fail == 0:
        A("- 无。40/40 全部 PASS 并已部署。")
    else:
        A("- 以下 %d 个 FAIL 未部署(需人工复审或强化 prompt 重生成):" % n_fail)
        for r in results:
            if r["status"] == "FAIL":
                A("  - `%s` (%s · %s) verdict=%s raw=%s" % (r["weapon_id"], r["category"], r["name"], r["verdict"], (r["raw"] or "")[:120]))
    A("- 接线(把图标路径挂到前端/在 .rs 中消费)后续另做, 本次不改任何 .rs。")

    with open(LOG_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("\nWROTE %s" % LOG_PATH, flush=True)

    # console 汇总
    print("\n==== SUMMARY ====", flush=True)
    for idx, cat, wid, cname, ok_, att, vd, raw in raw_lines:
        print("%-4s %-5s %-22s %-14s %s (tries=%d, vd=%s)" % (
            "PASS" if ok_ else "FAIL", cat, wid, cname, "", att, vd), flush=True)
    print("\nPASS=%d FAIL=%d est_cost=¥%.2f" % (n_pass, n_fail, est_cost), flush=True)


if __name__ == "__main__":
    # 让 stdout 支持中文
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
