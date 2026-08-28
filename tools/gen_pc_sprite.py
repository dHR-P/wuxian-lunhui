# -*- coding: utf-8 -*-
"""Generate the protagonist (郑吒) full-body sprite (768x1024, pure black bg) via local ComfyUI Z-Image.
Same black-bg pipeline as gen_enemy_sprites.py (the only verified reliable base).
Usage:
  python gen_pc_sprite.py
Outputs: tools/design/raw_enemy/pc_zhengzha.png
Prints "DONE pc_zhengzha <relpath>" when finished.
"""
import json, os, sys, time, urllib.request, urllib.error, urllib.parse

HOST = "http://127.0.0.1:8188"
W, H = 768, 1024
STEPS = 24
CFG = 7.0
SEED_BASE = 20260912

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "design", "raw_enemy")
os.makedirs(OUT_DIR, exist_ok=True)

NEG = ("文字,字幕,水印,低分辨率,模糊,畸变,多余肢体,多张脸,裁切,二次元,过曝,低质量,残缺肢体,"
       "english text, watermark, blurry, deformed hands, cropped, "
       "smoke, fog, mist, fumes, toxic gas, particles, dust, glow, aura, "
       "backlight, rim glow, lens flare, light burst, radial light, light beam, "
       "floor reflection, reflection, light spot, spotlight from behind, "
       "烟雾,雾气,毒气,粉尘,光晕,特效残影,背光,逆光,边缘光晕,地面反光,光斑,聚光灯,放射光线")

# 纯黑背景统一配方（与 gen_enemy_sprites.py 逐字一致 —— zombie 验证成功 96.2% 纯黑底）。
# 注意：Z-Image 对"纯白/渐变背景"遵循度差（会画成场景/渐变，flood 必吃主体），
# 纯黑背景是唯一被验证可靠的基底；主体必须受明亮冷白主光照亮，避免死黑剪影。
BLACK_BG = "背景为纯黑色(#000000)，无任何场景元素，无地面、无投影、无道具、无杂物，画面中仅主体居中；人物受明亮冷白主光正面照明（正面 key light），全身从头到脚均匀受光、皮肤与衣物细节清晰可辨，与纯黑背景强烈明暗分离，恐怖写实风格，细节清晰"
STYLE = "恐怖生存游戏《生化蜂巢》的主角全身立绘，完整全身入镜（头顶到脚底），居中构图，整体照明充足，主体清晰明亮，"
ITEM = {
    "id": "pc_zhengzha",
    "prompt": (STYLE +
               "年轻中国男青年（约25岁），黑色短发，面容坚毅冷峻、五官清晰可辨，穿深灰蓝色紧身T恤与深色战术长裤，腰系战术腰带，双臂自然下垂握拳，笔直站立，"
               "全身被明亮的冷白色轮廓光（rim light）环绕：头发、双肩、双臂外侧、躯干两侧、双腿外侧、衣摆下缘都有一圈清晰明亮的冷白轮廓线，与纯黑背景完全分离，人物内部保持正常明暗，"
               "主体位于画面中央，头顶接近画面上缘但留出少量纯黑空隙，脚底贴近画面底缘、紧贴画面底部，双腿完整修长、双脚稳稳踩在画面底部，"
               "画面下方仅留约十分之一的纯黑空隙，底部绝无地面、阴影、倒影，"
               + BLACK_BG),
}

WORKFLOW_TMPL = {
    "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_bf16.safetensors", "weight_dtype": "default"}},
    "2": {"class_type": "VAELoader", "inputs": {"vae_name": "ae_zimage.safetensors"}},
    "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b.safetensors", "type": "lumina2"}},
    "4": {"class_type": "TextEncodeZImageOmni", "inputs": {"clip": ["3", 0], "prompt": "", "auto_resize_images": False}},
    "5": {"class_type": "TextEncodeZImageOmni", "inputs": {"clip": ["3", 0], "prompt": NEG, "auto_resize_images": False}},
    "6": {"class_type": "EmptyLatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
    "7": {"class_type": "KSampler", "inputs": {
        "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0],
        "seed": SEED_BASE, "steps": STEPS, "cfg": CFG,
        "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["2", 0]}},
    "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "game_pc"}},
}


def post(payload):
    req = urllib.request.Request(HOST + "/prompt",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def fetch(url):
    return json.loads(urllib.request.urlopen(url, timeout=30).read())


def download(url, dest):
    with urllib.request.urlopen(url, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())


def gen_one(item, seed):
    wf = json.loads(json.dumps(WORKFLOW_TMPL))
    wf["4"]["inputs"]["prompt"] = item["prompt"]
    wf["7"]["inputs"]["seed"] = seed
    payload = {"prompt": wf, "client_id": "game_pc_sprite", "extra_data": {"extra_pnginfo": {}}}
    r = post(payload)
    prompt_id = r["prompt_id"]
    print("SUBMITTED %s prompt_id=%s" % (item["id"], prompt_id), flush=True)
    deadline = time.time() + 900
    while time.time() < deadline:
        try:
            hist = fetch(HOST + "/history/" + prompt_id)
        except urllib.error.HTTPError:
            time.sleep(2)
            continue
        if prompt_id in hist:
            out = hist[prompt_id]
            status = out.get("status", {})
            if status.get("status_str") == "error":
                print("GEN ERROR %s: %s" % (item["id"], status), flush=True)
                return None
            for nid, o in out.get("outputs", {}).items():
                for im in o.get("images", []):
                    sub = im.get("subfolder", "")
                    fn = im.get("filename", "")
                    dest = os.path.join(OUT_DIR, item["id"] + ".png")
                    url = HOST + "/view?filename=%s&subfolder=%s&type=output" % (urllib.parse.quote(fn), urllib.parse.quote(sub))
                    download(url, dest)
                    print("DONE %s %s" % (item["id"], dest), flush=True)
                    return dest
            return None
        time.sleep(2)
    print("TIMEOUT %s" % item["id"], flush=True)
    return None


if __name__ == "__main__":
    seed = SEED_BASE + int(time.time()) % 77777
    ok = gen_one(ITEM, seed)
    print("BATCH SUMMARY: %s" % ("1/1 succeeded" if ok else "0/1 failed"), flush=True)