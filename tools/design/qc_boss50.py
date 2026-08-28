# -*- coding: utf-8 -*-
"""qc_boss50.py — 对 raw_boss50 全部立绘跑 glm-5.3-flash 质检(PASS/FAIL), 结果写即时 .md 与汇总 json。
用法: python qc_boss50.py [slug1 ...] [--raw|--cut]
  --raw  质检 raw 立绘 (默认)
  --cut  质检抠图 cutout_boss50
输出: tools/design/qc_boss50_<kind>/boss_<slug>.md + 汇总 wooden json
"""
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_boss50")
CUT = os.path.join(BASE, "cutout_boss50")
MQ = os.path.join(BASE, "glm_qc.py")

ALL = {
    "sanjiaotou": "寂静岭风格金属三角头盔持巨刀灰袍暗红压抑肃杀的巨人BOSS, 全身贴底纯黑底",
    "fulaidi": "猛鬼街弗莱迪烧伤疤脸刀爪手套红绿条纹毛衣黑暗恐怖梦魇BOSS, 全身贴底纯黑底",
    "yizhong": "异种成体外星基因生物苍白无毛半透明异形结构茧膜BOSS, 全身贴底纯黑底",
    "jixianti": "寄生前夜线粒体聚合体细胞状千条触须幽蓝光血肉聚合BIOSS, 全身贴底纯黑底",
    "baojun": "生化暴君T-virus灰皮巨汉肌肉外露握拳暴虐BOSS, 全身贴底纯黑底",
    "miwujuwu": "迷雾中隐约巨大触须不可名状克苏鲁雾中巨物BOSS, 全身贴底纯黑底",
    "xingshiwang": "死雾镇雾中行尸王灰雾吞噬畸形行尸黑雾缠绕BOSS, 全身贴底纯黑底",
    "juanzhe": "沉没神殿旧神眷属海底旧神半透明触手深蓝BOSS, 全身贴底纯黑底",
    "kuangxie": "函谷关箜邪万族狂化军团长蛮荒铠甲血色BOSS, 全身贴底纯黑底",
    "shourenchaowang": "无尽森林兽人战潮王兽人巨汉骨甲煞气BOSS, 全身贴底纯黑底",
    "jixieronghe": "天网机械融合体机械+血肉融合红眼冷金属BOSS, 全身贴底纯黑底",
    "poxujiezhe": "破虚异界来者跨界存在法则化身半透明辉光仙侠感BOSS, 全身贴底纯黑底",
}

ALL_SLUGS = list(ALL.keys())


def verdict_of(md_path):
    if not os.path.exists(md_path):
        return "NOFILE"
    with open(md_path, "r", encoding="utf-8") as f:
        txt = f.read()
    tail = txt[-60:]
    return "PASS" if ("PASS" in txt and "FAIL" not in tail) else "FAIL"


def main():
    args = sys.argv[1:]
    cut = "--cut" in args
    suffix = ""
    if "--suffix" in args:
        suffix = args[args.index("--suffix") + 1]
        args = [a for a in args if a != "--suffix"]
    slugs = [a for a in args if not a.startswith("--")] or ALL_SLUGS
    kind = "cutout" if cut else "raw_lihui"
    src_dir = CUT if cut else RAW
    out_dir = os.path.join(BASE, "qc_boss50_%s" % ("cut" if cut else "raw"))
    os.makedirs(out_dir, exist_ok=True)
    results = {}
    for slug in slugs:
        img = os.path.join(src_dir, "boss_%s%s.png" % (slug, suffix))
        md = os.path.join(out_dir, "boss_%s%s.md" % (slug, suffix))
        if not os.path.exists(img):
            print("MISSING %s" % img, flush=True)
            results[slug] = {"status": "MISSING_IMAGE", "file": img}
            continue
        cmd = [sys.executable, MQ, img, kind, ALL.get(slug, slug), md]
        print(">>> QC boss_%s (%s)" % (slug, kind), flush=True)
        # 用 bytes 读取并 replace 解码, 避免 GBK 崩溃; glm_qc 结果已独立写入 md 文件
        try:
            p = subprocess.run(cmd, cwd=BASE, capture_output=True, timeout=1200)
        except subprocess.TimeoutExpired:
            print(">>> QC boss_%s TIMEOUT (md=%s)" % (slug, md), flush=True)
            results[slug] = {"status": "TIMEOUT", "file": img, "md": md}
            continue
        tail = (p.stdout.decode("utf-8", errors="replace") + p.stderr.decode("utf-8", errors="replace"))[-1200:]
        # 控制台可能 GBK 无法打印多字节字符; 打印时替换非 ascii 以保不崩, 完整文本见 md 文件
        safe = "".join(c if ord(c) < 128 else "." for c in tail)
        print(safe, flush=True)
        v = verdict_of(md)
        results[slug] = {"status": v, "file": img, "md": md}
        print("VERDICT boss_%s: %s" % (slug, v), flush=True)
    with open(os.path.join(out_dir, "_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("QC DONE -> %s" % os.path.join(out_dir, "_results.json"), flush=True)


if __name__ == "__main__":
    main()