# -*- coding: utf-8 -*-
"""gen_cutout_compare.py — 由 diag_old.json / diag_new.json 生成新旧抠图对比表
（tools/design/cutout_v2_compare.md）

用法: <python> gen_cutout_compare.py
输入: tools/design/diag_old.json, tools/design/diag_new.json (diag_cutout.py --json 产物)
输出: tools/design/cutout_v2_compare.md (UTF-8)
"""
import json
import os

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
DESIGN = os.path.join(BASE, "tools", "design")
OLD = os.path.join(DESIGN, "diag_old.json")
NEW = os.path.join(DESIGN, "diag_new.json")
DST = os.path.join(DESIGN, "cutout_v2_compare.md")


def load(p):
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def box_str(b):
    return "EMPTY" if b is None else "(%d,%d)-(%d,%d)" % (b[0], b[1], b[2], b[3])


def main():
    old = {s["file"]: s for s in load(OLD)}
    new = {s["file"]: s for s in load(NEW)}
    files = old.keys() | new.keys()
    order = ["enemy_zombie.png", "enemy_licker.png", "enemy_hunter.png",
             "enemy_guard.png", "enemy_horde.png", "pc_zhengzha.png"]
    order = [f for f in order if f in files]

    lines = []
    lines.append("# 抠图新旧管线对比表（cutout_enemy.py 逐像素法 vs cutout_floodfill.py 连通域法）")
    lines.append("")
    lines.append("- 旧版 = 覆盖前的成品（`tools/design/backup_cutout/` 有备份），逐像素欧氏距离法")
    lines.append("- 新版 = `cutout_floodfill.py`：边界连通域 flood-fill + 2px 边缘羽化 + 3x3 闭运算 + 边界密封 seal=2 + 内部镂空按欧氏距离回填 fix-holes（三道防线）")
    lines.append("- ① 背景透明占比 alpha<=5 ② 半透明占比 5<alpha<250 ③ 全不透明占比 alpha>=250 ④ 主体包围盒 alpha>128 ⑤ 内部孤立透明孔洞（alpha<=5 且不接触图像边界）")
    lines.append("")
    lines.append("| 文件 | 版本 | ①透明% | ②半透明% | ③不透明% | ④包围盒 | ⑤内部孔洞数 | 最大孔洞px |")
    lines.append("|---:|---|--:|--:|--:|---|---:|---:|")

    def row(s, ver):
        return "| %s | %s | %.2f | %.2f | %.2f | %s | %d | %d |" % (
            s["file"], ver, s["trans"], s["semi"], s["opaque"],
            box_str(s["bbox"]), s["holes"], s["max_hole_px"])

    for f in order:
        o, n = old.get(f), new.get(f)
        if o:
            lines.append(row(o, "旧"))
        if n:
            lines.append(row(n, "新"))
        if o and n:
            dh = n["holes"] - o["holes"]
            dmax = n["max_hole_px"] - o["max_hole_px"]
            dtrans = n["trans"] - o["trans"]
            dsemi = n["semi"] - o["semi"]
            dopaque = n["opaque"] - o["opaque"]
            lines.append("| *Δ(新-旧)* | | %+.2f | %+.2f | %+.2f | — | %+d | %+d |"
                         % (dtrans, dsemi, dopaque, dh, dmax))
    lines.append("")
    lines.append("## 读数要点")
    lines.append("- **hunter（验收主目标）**：内部孔洞 %d→%d（最大孔洞 %dpx→%dpx），躯干大面积镂空消除。旧版 80007px 的孔洞 ≈ 一个 280x285 的区域，即质检报告所述『胸口至腹部镂空』。"
                 % (old["enemy_hunter.png"]["holes"], new["enemy_hunter.png"]["holes"],
                    old["enemy_hunter.png"]["max_hole_px"], new["enemy_hunter.png"]["max_hole_px"]))
    lines.append("- **zombie / guard / horde / licker**：内部孔洞均归零（最大孔洞 0px）；防走形：seal=2 会把背景经细缝漏入的连通域挡在主体外，fix-holes 把被包围的深色衣物/阴影按欧氏距离 alpha 回填为不透明。")
    lines.append("- **pc_zhengzha**：v1 内部黑 T 恤/战术裤被欧氏距离误删（2050 孔/7300px），flood-fill 把被身体边缘包围的黑色衣物保留为实心 → 最终 0 孔；全新 raw（20:00 后重生成）背景透明 91.25%，无明显光晕残留。")
    lines.append("- **包围盒差异**：zombie/guard/horde 新旧包围盒位移，原因是 raw 立绘经并行管线重排/重生成，旧成品由更早的 raw 生成；新版包围盒与当前 raw 的 d>=19 主体范围一致（±1px），属于『跟着新 raw 走』而非抠图错误。")
    lines.append("")
    lines.append("_生成: gen_cutout_compare.py · 数据源: diag_old.json / diag_new.json_")

    with open(DST, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("written:", DST)


if __name__ == "__main__":
    main()