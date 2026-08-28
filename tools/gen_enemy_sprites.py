# -*- coding: utf-8 -*-
"""Generate 5 enemy full-body sprites (768x1024, pure black bg) via local ComfyUI Z-Image.
Usage:
  python gen_enemy_sprites.py            # generate all
  python gen_enemy_sprites.py zombie     # generate one
Outputs: downloads raw PNGs into tools/design/raw_enemy/<id>.png
Prints "DONE <id> <relpath>" per finished image.
"""
import json, os, sys, time, urllib.request, urllib.error, urllib.parse

HOST = "http://127.0.0.1:8188"
W, H = 768, 1024
STEPS = 24
CFG = 7.0
SEED_BASE = 20260911

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "design", "raw_enemy")
os.makedirs(OUT_DIR, exist_ok=True)

NEG = ("文字,字幕,水印,低分辨率,模糊,畸变,多余肢体,多张脸,裁切,二次元,过曝,低质量,残缺肢体,"
       "english text, watermark, blurry, deformed hands, cropped, "
       "smoke, fog, mist, fumes, toxic gas, particles, dust, glow, aura, "
       "烟雾,雾气,毒气,粉尘,光晕,特效残影")

STYLE = "恐怖生存游戏《生化蜂巢》的敌人全身立绘，完整全身入镜（头顶到脚底），居中构图，整体照明充足，主体清晰明亮，"
BRIGHT = "背景为纯白色(#FFFFFF)，场景明亮，主体与背景强烈明暗分离，明亮冷青色轮廓光，高光细节丰富，恐怖写实风格，细节清晰"
# 纯黑背景统一配方（zombie 验证成功：96.2% 纯黑底 → v1 距离法抠图干净）。
# 注意：Z-Image 对"纯白/渐变背景"遵循度差（会画成场景/渐变，flood 必吃主体），
# 纯黑背景是唯一被验证可靠的基底；主体必须受明亮冷白主光照亮，避免死黑剪影。
BLACK_BG = "背景为纯黑色(#000000)，无任何场景元素，无地面、无投影、无道具、无杂物，画面中仅主体居中，主体受明亮冷白主光照明（key light），与纯黑背景强烈明暗分离，轮廓清晰，高光细节丰富，恐怖写实风格，细节清晰"
ITEMS = [
    {"id": "zombie", "prompt": STYLE + "站台丧尸，直立蹒跚姿态，苍白灰绿的腐烂皮肤，破裂站台制服，血污与伤口，空洞浑浊双眼，双手前伸，全身整体提亮，"
     "主体位于画面中央偏上，头顶接近画面上缘但留出纯黑空隙，脚底位于画面垂直中线附近，画面下方约四分之一区域为空旷纯黑背景，底部绝无地面、阴影、倒影，"
     + BLACK_BG},
    {"id": "licker", "prompt": STYLE + "舔食者，无皮裸露的鲜亮深红色肌肉躯体（bright crimson muscle，材质高光明显），外露大脑与骨骼，没有眼睛，长而锋利的爪子，四肢着地匍匐爬行姿态，"
     "长舌微吐，全身整体提亮，肌肉纹理清晰可辨，" + BLACK_BG},
    {"id": "hunter", "prompt": STYLE + "猎杀者·实验体，直立站姿的完整人形生物，绝非人类、身上绝无任何衣物或布料，宽肩厚胸、躯干为密闭实心整体（胸腹完全闭合、绝无镂空缝隙或透空），粗壮厚实的肌肉四肢，双腿粗壮完整、双脚稳稳站立，膨胀的肌肉块面与骨刺，浅灰棕色生物皮肤、皮肤表面高光明显，"
     "左手巨爪右手利刃，凶悍站姿，全身被明亮的冷白色轮廓光（rim light）环绕：头顶、双肩、双臂外侧、躯干两侧、双腿外侧、巨爪利刃边缘都有一圈清晰明亮的冷白轮廓线与纯黑背景完全分离，躯干中下部、下腹部与胯部有清晰的肌肉高光与轮廓起伏（腹肌、胯部肌肉块面清晰可辨），浅灰棕色皮肤整体厚度实、肌肉饱满，"
     "主体位于画面中央，头顶接近画面上缘但留出少量纯黑空隙，脚底贴近画面底缘、紧贴画面底部，双腿粗壮完整、双脚稳稳踩在画面底部，画面下方仅留约十分之一的纯黑空隙，底部绝无地面、阴影、倒影，"
     + BLACK_BG},
    {"id": "guard", "prompt": STYLE + "保安丧尸，穿深蓝色制服与防暴背心，青灰腐烂皮肤，手持警棍，歪斜蹒跚站姿，血污，全身整体提亮，"
     "深蓝制服与黑色背景强烈明暗分离，裤腿与皮鞋清晰可见，主体位于画面中央偏上，头顶接近画面上缘但留出纯黑空隙，"
     "脚底位于画面垂直中线附近，画面下方约四分之一区域为空旷纯黑背景，底部绝无地面、阴影、倒影，"
     + BLACK_BG},
    {"id": "horde", "prompt": STYLE + "丧尸群群像:三名丧尸(列车员、医生、乘客)拥挤并排蹒跚走来,张牙舞爪,血污破烂衣物,灰绿色腐烂皮肤,"
     "全身整体提亮清晰,主体整体位于画面中央,头顶接近画面上缘,脚底位于画面垂直中线附近,画面下方约四分之一区域为空旷纯黑背景,"
     "底部绝无地面阴影倒影，" + BLACK_BG},
]

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
    "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "game_enemy"}},
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
    payload = {"prompt": wf, "client_id": "game_enemy_sprites", "extra_data": {"extra_pnginfo": {}}}
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
    wanted = sys.argv[1:] or [it["id"] for it in ITEMS]
    items = [it for it in ITEMS if it["id"] in wanted]
    ok = 0
    for i, it in enumerate(items):
        seed = SEED_BASE + i * 7919 + int(time.time()) % 77777
        if gen_one(it, seed):
            ok += 1
    print("BATCH SUMMARY: %d/%d succeeded" % (ok, len(items)), flush=True)
