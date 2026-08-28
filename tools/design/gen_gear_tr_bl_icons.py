# -*- coding: utf-8 -*-
"""gen_gear_tr_bl_icons.py — 为 40 个护甲/法宝/血统图标生成(纯黑底方形768x768)并质检部署。
流程: gen_wan.py:gen ("768x768") → qwen3.7-flash 质检(纯黑底/无文字/图标清晰) → 合格则部署。
输出命名: 护甲 gear_<id>.png / 法宝 tr_<id>.png / 血统 bl_<id>.png。
部署目录: server-rs/ui/assets/img/。不触碰任何 .rs。
输出 log: tools/design/gear_tr_bl_icons_log.md
"""
import base64
import io
import json
import os
import re
import shutil
import sys
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_wan import gen  # noqa: E402

STAGE_DIR = os.path.join(HERE, "gear_tr_bl_stages")
os.makedirs(STAGE_DIR, exist_ok=True)

# 真实资源目录是仓库根下 server-rs/ui/assets/img (tools/server-rs 是历史镜像, 勿写)
DEPLOY_DIR = os.path.join(os.path.dirname(os.path.dirname(HERE)), "server-rs", "ui", "assets", "img")
os.makedirs(DEPLOY_DIR, exist_ok=True)

LOG_PATH = os.path.join(HERE, "gear_tr_bl_icons_log.md")

CRED = r"C:\Users\GWL\.dsh\.credentials.yaml"
QC_URL = "https://tokenrhythm.studio/v1/chat/completions"
QC_MODEL = "qwen3.7-flash"

MAX_RETRY = 2

# 提示词公共前缀(与已验证的图标模板一致)
COMMON = (
    "A clean flat 2D game icon of a single object rendered on a perfectly uniform pure black "
    "(#000000) background, edge to edge. The object sits exactly centered occupying about "
    "65% of the square frame, fully visible, with its whole silhouette inside the frame. "
    "Flat matte stylized rendering with even ambient lighting; all modeling is achieved with "
    "INTERIOR shading and texture only. "
    "CRITICAL — NO RIM LIGHT: the object has NO bright white outline, NO white rim, NO white "
    "silhouette stroke, NO glowing edge, NO backlight highlight running along its contour; "
    "the very edge of the object fades into plain dark so it terminates cleanly against the "
    "black. "
    "CRITICAL — NO GLOW/BLOOM: the object emits NO glow, NO halo, NO light beam, NO bloom; "
    "the area around the object remains absolutely uniform solid black edge to edge, no "
    "gradient, no vignette, no color cast, no reflection on the floor. "
    "NO text, NO letters, NO numbers, NO watermark, NO logo, NO emblem, NO border, NO frame, "
    "NO caption, NO decorative ring. Crisp, clean, professional flat game icon, straight-on "
    "front view. "
    "Item content: "
)

# (kind, category, id, 中文名, 英文内容描述)
ITEMS = [
    # ================= 护甲 15 =================
    ("gear", "护甲", "gear_shengclothes_shooter", "射手座黄金圣衣",
     "a golden Greek saint armor (a golden Sagittarius cloth), a torso-and-helmet gold plate armor chestpiece with archer wing details, polished radiant gold, hole-free solid plates"),
    ("gear", "护甲", "gear_nano_mecha_suit", "纳米战甲·机甲",
     "a sleek sci-fi nano-mecha combat suit torso armor, angular dark metallic panels with faint cyan circuit seams, compact power core on the chest"),
    ("gear", "护甲", "gear_leidun_armor", "雷霆铠甲",
     "a thunder-god armored chestplate, dark steel plates with lightning-bolt embossed details and faint yellow energy veins crackling confined to the surface"),
    ("gear", "护甲", "gear_longlin_jia", "龙鳞逆甲",
     "an armor piece made of overlapping emerald dragon scales, layered scale chestplate with a subtle serpentine dragon-head shoulder, glossy but matte-finished green scales"),
    ("gear", "护甲", "gear_shengguang_fapao", "圣光法袍",
     "a holy mage robe folded as an icon, a white-gold priest ceremonial robe with a radiant cross motif on the chest and flowing cloth folds, warm ivory and gold"),
    ("gear", "护甲", "gear_wh_warframe", "战争框架·重装",
     "a heavy battle-worn power armour warframe torso, thick dark military plating with rivets, shoulder pauldrons and a central reactor, rugged industrial armor"),
    ("gear", "护甲", "gear_ice_dragon_scale", "冰霜巨龙鳞甲",
     "a frost dragon-scale cuirass, icy pale-blue translucent scales with frost crystals on the edges, cold silver dragon-plated chest armor"),
    ("gear", "护甲", "gear_shadow_cloak_armor", "暗影皮甲",
     "a shadow assassin leather armor, a sleek dark leather chest piece with a hooded-shadow motif, deep charcoal with subtle purple-tinted edge stitching"),
    ("gear", "护甲", "gear_holy_plate_armor", "圣骑士板甲",
     "a holy paladin full plate cuirass, gleaming silver-white steel armor with golden trim and a small cross emblazoned on the chest, noble knight armor"),
    ("gear", "护甲", "gear_zero_absorb", "绝对零度护甲",
     "an absolute-zero cryo armor chestpiece, ice-blue and white metallic plates covered in frost, cold crystalline layers, faint icy steam texture confined to surface"),
    ("gear", "护甲", "gear_sanctum_plate", "圣域板甲",
     "a sanctum guardian plate armor, ornate gold-and-silver ceremonial chestplate with celestial engravings and a central glowing gem, ancient sacred guardian armor"),
    ("gear", "护甲", "access_hades_cloak", "幽冥披风",
     "a spectral underworld cloak, a tattered flowing dark cloak with wispy purple-ethereal fabric tassels at the shoulders, ghostly dark violet mantle"),
    ("gear", "护甲", "access_will_anchor", "意志锚链",
     "a will-anchor talisman, a heavy dark iron anchor medal with a spiked halo ring around its crown and fine silver chain links, a solid emblem-style anchor pendant"),
    ("gear", "护甲", "gear_tian_yi", "神炁天衣",
     "a heavenly qi celestial robe, a flowing white-and-gold immortal robe with swirling qi energy ribbons wrapped around the folded cloth, divine flowing garment"),
    ("gear", "护甲", "gear_adamant_cuirass", "精金胸甲",
     "a mythril adamantite cuirass, a polished dark-blue metallic chestplate with silver bracing and a hexagonal steel core, sturdy dwarven masterwork armor"),

    # ================= 法宝 15 =================
    ("tr", "法宝", "tr_sisin_luandao", "死神镰刀·摄魂",
     "a grim reaper scythe, a long dark staff with a large curved single-edge blade, a small skull pommel and wispy dark ribbons, deadly spectral scythe"),
    ("tr", "法宝", "tr_duantou_mojing", "魔镜·破碎之握",
     "a broken magic mirror held in a dark claw-like frame, a cracked jet-black mirror surface with a faint rune etched at the fracture, gothic cursed hand-mirror"),
    ("tr", "法宝", "tr_xianzhe_ziliao", "贤者之石·点金",
     "a philosopher's stone, a glowing deep-red faceted gemstone centered on an ornate gold alchemy mount, radiant crimson crystal with gold filigree, contained no bloom"),
    ("tr", "法宝", "tr_leishen_xianglu", "雷神之锤·神威",
     "the god of thunder hammer (Mjolnir-styled), a heavy square-headed war hammer with runes on the face and a short leather-wrapped handle, crackling lightning veins on the head only"),
    ("tr", "法宝", "tr_shengbei_shengtian", "圣杯·神圣权柄",
     "a holy grail chalice, a golden goblet with two ornate handles set with small blue gems, radiating a soft divine radiance confined to the gold surface, radiant sacred cup"),
    ("tr", "法宝", "tr_mo_jie_jiujie", "魔戒·至尊戒",
     "a dark one-ring, a plain heavy gold ring with a small angular engraved wedge rune, sitting upright with a faint dark aura confined to the metal, sinister magic ring"),
    ("tr", "法宝", "tr_yinyang_jing", "阴阳宝镜",
     "a yin-yang treasure mirror, a round ornate mirror whose face is a black-and-white taiji swirl, framed in dark bronze with trigram accents around the rim"),
    ("tr", "法宝", "tr_zhuxian_calendar", "诛仙剑意图",
     "a jade scroll emblazoned with four immortal-slaying swords crossed over a radiant seal, four distinct colored jade swords (green/white/red/blue) laid over the scroll"),
    ("tr", "法宝", "tr_blood_banner", "血煞战旗",
     "a blood banners of war, a dark war-banner with tattered ends bearing a stylized crimson blood-crest, pole topped with a sharp blade finial, ancient war banner"),
    ("tr", "法宝", "tr_taixu_shield", "太虚玄光镜",
     "a taixu radiance mirror shield, a round silver mirror within a bronze guard whose face glows pale void-blue, celestial glow confined to the mirror face"),
    ("tr", "法宝", "tr_shenlei_pendant", "神雷辟邪佩",
     "a divine-thunder warding amulet, a round jade pendant carved with a coiled thunder dragon and a lightning gua trigram, pale green jade with golden thunder relief"),
    ("tr", "法宝", "tr_danxin_mirror", "锻心明镜",
     "a heart-forging meditation mirror, a plain round bronze mirror with a simple polished face reflecting a soft inner light, clean austere meditation mirror"),
    ("tr", "法宝", "tr_undo_pillowstone", "逆转生死盘",
     "a reversal-of-life-and-death wheel, a carved dark disk with a spiral of yin-yang petals and a central skull-and-flower motif, rotating destiny wheel artifact"),
    ("tr", "法宝", "tr_bahuang_longyin", "八荒龙印",
     "a grand nine-dragon imperial seal, a square celestial jade seal topped with a coiled dragon knob, dark-green jade with nine small dragons circling the base"),
    ("tr", "法宝", "tr_longzu_shengyi", "龙珠·七龙珠",
     "a radiant dragon orb, a single glowing orange spherical dragon-ball with translucent star-speckle interior and swirling dragon cloud pattern within"),

    # ================= 血统 10 =================
    ("bl", "血统", "sharingan_bloodline", "写轮眼",
     "the sharingan eye sigil, a single red eye with the three-tomoe swirl pupil at its center, drawn as a clean flat emblem-style eye mark on black"),
    ("bl", "血统", "hollow_bloodline", "虚化",
     "a hollow mask fragment emblem, a white angular bone-like mask with jagged teeth and a long cracked open eye-hole, sinister hollow mask icon"),
    ("bl", "血统", "saiyan_bloodline", "赛亚人",
     "a saiyan power emblem, a fierce spiky-hair head silhouette filled with electric golden aura and a lone blood-red eye glaring forward, saiyan rage icon"),
    ("bl", "血统", "saint_bloodline", "圣斗士",
     "a saint armor crest emblem, a golden winged helmet badge with a small star burst and a crossed laurel, noble golden saint emblem"),
    ("bl", "血统", "shinigami_bloodline", "死神",
     "a soul-reaper emblem, a black katana crossed behind a white hexagonal spirit-crest badge with a pale death-moon, clean shinigami insignia"),
    ("bl", "血统", "quincy_bloodline", "灭却师",
     "a quincy spiritual emblem, a glowing pale-blue five-pointed spiritual bow arc with an interlaced holy-silver cross, radiant quincy insignia"),
    ("bl", "血统", "uchiha_bloodline", "宇智波",
     "an uchiha clan crest, a red-and-white Japanese fan (uchiwa) shield emblem with a single red pinwheel tomoe in the center, flat clan crest icon"),
    ("bl", "血统", "otsutsuki_bloodline", "大筒木",
     "an otsutsuki god-tree emblem, a pale six-ring infinite eye pattern with a central crescent circle, ethereal cosmic rinnegan-style mark"),
    ("bl", "血统", "mitsurugi_bloodline", "鬼灭呼吸·日之呼吸",
     "a sun-breathing sword arc emblem, a black katana with a flame-patterned blade traced by a rising red sun disc behind it, demon-slayer sun kenshi mark"),
    ("bl", "血统", "demon_bloodline", "恶魔",
     "a demon bloodline mark, a pair of curved black horns flanking a glowing crimson pentagram sigil, sinister demon crest engraved with runes"),
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
    """qwen3.7-flash 质检图标(纯黑底/无文字/图标清晰)。返回 (verdict, raw)"""
    key = get_qc_key()
    sys_prompt = (
        "你是游戏图标质检员。以下给出图标图与期望内容, 请只输出一个 JSON 对象, 不要输出任何解释、推理或代码块。\n"
        "判定口径:\n"
        "1) 背景: 图标主体之外的底色应整体为黑色(允许极轻微的近黑噪点/极淡微差忽略), "
        "但若出现明显的灰/蓝/红渐变、雾、辉光、地板反光、画面感背景则 FAIL。\n"
        "2) 无文字字母数字、无水印、无logo、无边框、无版权标识, 出现即 FAIL。\n"
        "3) 主体: 清晰可辨、居中、符合期望内容、无残缺/畸形/截断, 命中即为 PASS 前提。\n"
        "4) 污染: 主体轮廓外一圈完整的白色描边/亮白轮廓/外发光环视为污染判 FAIL; "
        "金属/材质自身轮廓内的高光不算污染。\n"
        "输出格式必须严格为: "
        "{\"verdict\":\"PASS 或 FAIL\",\"issues\":\"具体问题，无则空串\",\"brief\":\"一句说明\"}"
    )
    user_msg = "请质检这张%s（期望内容：%s）。" % ("护甲/法宝/血统图标", expect)
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
    return extract_verdict(out), out


def extract_verdict(out):
    out = out or ""
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
    if "FAIL" in out or "不通过" in out or "不合格" in out:
        return "FAIL"
    if "PASS" in out or "通过" in out or "合格" in out:
        return "PASS"
    return "ERR"


def main():
    results = []
    raw_lines = []
    total = len(ITEMS)
    for idx, (kind, cat, iid, cname, en_desc) in enumerate(ITEMS, 1):
        prefix = "gear_" if kind == "gear" else ("tr_" if kind == "tr" else "bl_")
        out_name = "%s%s.png" % (prefix, iid)
        final_deploy = os.path.join(DEPLOY_DIR, out_name)
        expect = "%s（%s）" % (cname, iid)
        prompt = COMMON + en_desc
        stage_path = None
        verdict = "FAIL"
        raw = ""
        tried = 0
        attempts = 0
        total_tries = 1 + MAX_RETRY
        while tried < total_tries:
            tried += 1
            attempts = tried
            stage_path = os.path.join(STAGE_DIR, "%02d_%s_%s.png" % (idx, prefix, iid))
            print("\n[%d/%d] %s %s (%s) gen attempt %d..." % (
                idx, total, cat, cname, iid, tried), flush=True)
            ok = gen(prompt, "768x768", stage_path)
            if not ok:
                raw = "GEN_FAIL"
                continue
            verdict, raw = qc_icon(stage_path, expect)
            qc_tries = 1
            while verdict == "ERR" and qc_tries < 4:
                verdict, raw = qc_icon(stage_path, expect)
                qc_tries += 1
            print("  QC verdict=%s  raw=%s" % (verdict, raw[:120]), flush=True)
            if verdict == "PASS":
                break
        else:
            verdict = "FAIL"

        pass_flag = (verdict == "PASS")
        if pass_flag and stage_path:
            shutil.copyfile(stage_path, final_deploy)
            print("  DEPLOYED -> %s" % final_deploy, flush=True)
        else:
            final_deploy = None
            print("  RESULT FAIL (verdict=%s, raw=%s)" % (verdict, raw[:80]), flush=True)

        results.append({
            "idx": idx, "kind": kind, "category": cat, "item_id": iid, "name": cname,
            "status": "PASS" if pass_flag else "FAIL",
            "attempts": attempts, "verdict": verdict, "raw": raw,
            "deployed": final_deploy,
        })
        raw_lines.append((idx, cat, iid, cname, pass_flag, attempts, verdict, raw))

    n_pass = sum(1 for r in results if r["status"] == "PASS")
    n_fail = sum(1 for r in results if r["status"] == "FAIL")
    total_gen_calls = sum(r["attempts"] for r in results)
    est_cost = total_gen_calls * COST_CNY["per_image"]

    lines = []
    A = lines.append
    A("# 护甲/法宝/血统 图标生成 log (40 个)\n")
    A("\n**工作目录**: `%s`\n" % os.getcwd())
    A("\n**日期**: %s\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
    A("\n## 验收\n")
    A("- 目标: 40 个图标(护甲15/法宝15/血统10, 纯黑底方形768×768, 无文字水印, 图标清晰居中)")
    A("- 输送: `gen_wan.py:gen(\"768x768\")` → qwen3.7-flash 质检 → 部署 `server-rs/ui/assets/img/`")
    A("- 命名: 护甲→`gear_<id>.png` / 法宝→`tr_<id>.png` / 血统→`bl_<id>.png`")
    A("- **PASS: %d | FAIL: %d** (≤2 次重试/个)" % (n_pass, n_fail))
    A("- 生图调用次数(含重试): %d → 预估花费: ¥%.2f (0.2元/次)" % (total_gen_calls, est_cost))
    A("- 不碰 .rs (接线后续另做)")

    A("\n## 逐条结果\n")
    A("| # | 类别 | id | 图标文件 | 中文名 | 结果 | 试次数 | 质检说明 |")
    A("|---|------|-----|---------|--------|------|--------|----------|")
    for r in results:
        prefix = "gear_" if r["kind"] == "gear" else ("tr_" if r["kind"] == "tr" else "bl_")
        fn = ("%s%s.png" % (prefix, r["item_id"])) if r["deployed"] else "-"
        brief = (r["raw"] or "").replace("\n", " ")[:90]
        A("| %d | %s | `%s` | `%s` | %s | **%s** | %d | %s |" % (
            r["idx"], r["category"], r["item_id"], fn, r["name"],
            r["status"], r["attempts"], brief))

    A("\n## 部署清单\n")
    A("(部署到 `server-rs/ui/assets/img/`)\n")
    for r in results:
        prefix = "gear_" if r["kind"] == "gear" else ("tr_" if r["kind"] == "tr" else "bl_")
        if r["deployed"]:
            A("- `%s%s.png`  (%s · %s)" % (prefix, r["item_id"], r["category"], r["name"]))
        else:
            A("- ~~%s%s.png~~ (%s · %s) — **FAIL**" % (prefix, r["item_id"], r["category"], r["name"]))

    A("\n## 遗留\n")
    if n_fail == 0:
        A("- 无。40/40 全部 PASS 并已部署。")
    else:
        A("- 以下 %d 个 FAIL 未部署(需人工复审或强化 prompt 重生成):" % n_fail)
        for r in results:
            if r["status"] == "FAIL":
                prefix = "gear_" if r["kind"] == "gear" else ("tr_" if r["kind"] == "tr" else "bl_")
                A("  - `%s%s.png` (%s · %s) verdict=%s raw=%s" % (prefix, r["item_id"], r["category"], r["name"], r["verdict"], (r["raw"] or "")[:120]))
    A("- 接线(把图标路径挂到前端/在 .rs 中消费)后续另做, 本次不改任何 .rs。")

    with open(LOG_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("\nWROTE %s" % LOG_PATH, flush=True)

    print("\n==== SUMMARY ====", flush=True)
    for idx, cat, iid, cname, ok_, att, vd, raw in raw_lines:
        print("%-4s %-5s %-22s %-14s %s (tries=%d, vd=%s)" % (
            "PASS" if ok_ else "FAIL", cat, iid, cname, "", att, vd), flush=True)
    print("\nPASS=%d FAIL=%d est_cost=¥%.2f" % (n_pass, n_fail, est_cost), flush=True)


if __name__ == "__main__":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
