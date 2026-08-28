# -*- coding: utf-8 -*-
"""make_preview_r5.py — 把 r5 cut 合成到深灰底查看预览 + 生成 32px 级小图(游戏内尺寸)。
用法: python make_preview_r5.py <cut.png> <preview.png> <small.png>
小图使用 LANCZOS,保留透明度;预览合成到 RGB(28,28,32) 便于查看边缘。
"""
import sys
from PIL import Image

def main():
    cut, preview, small = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(cut).convert("RGBA")
    w, h = im.size  # 宽度=768, 高度=1024
    # 小图:统一按高 48(竖版),保持原横纵比
    target = 48
    small_w = max(1, int(w * target / h))
    small_h = target
    im_small = im.resize((small_w, small_h), Image.LANCZOS)
    im_small.save(small, "PNG")
    # 预览合成到深灰底(横竖保持与 raw 一致:768x1024)
    bg = Image.new("RGBA", (w, h), (28, 28, 32, 255))
    bg.alpha_composite(im)
    bg.convert("RGB").save(preview, "PNG")
    print("PREVIEW %s (%dx%d) SMALL %s (%dx%d)" % (preview, w, h, small, small_w, small_h), flush=True)

if __name__ == "__main__":
    main()