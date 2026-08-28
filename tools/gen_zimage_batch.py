# -*- coding: utf-8 -*-
"""Batch Z-Image T2I via local ComfyUI API (port 8188).
Usage:
  python_embeded\\python.exe gen_zimage_batch.py <manifest.json> <id1> <id2> ...
  python_embeded\\python.exe gen_zimage_batch.py <manifest.json> ALL
Prints "DONE <id> <relpath>" per finished image.
"""
import json, sys, time, urllib.request, urllib.error

HOST = "http://127.0.0.1:8188"
W, H = 1344, 768
STEPS = 22
CFG = 7.0
SEED_BASE = 20260825

NEG = ("文字,字幕,水印,低分辨率,模糊,畸变,多余肢体,多张脸,裁切,二次元,过曝,低质量,"
       "english text, watermark, blurry, deformed hands")

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
    "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": ""}},
}


def post(payload):
    req = urllib.request.Request(HOST + "/prompt",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def fetch(url):
    return json.loads(urllib.request.urlopen(url, timeout=30).read())


def gen_one(item, seed):
    wf = json.loads(json.dumps(WORKFLOW_TMPL))
    prefix = "game_re/" + item["id"]
    wf["4"]["inputs"]["prompt"] = item["prompt"]
    wf["7"]["inputs"]["seed"] = seed
    wf["9"]["inputs"]["filename_prefix"] = prefix
    payload = {"prompt": wf, "client_id": "game_re_batch", "extra_data": {"extra_pnginfo": {}}}
    r = post(payload)
    prompt_id = r["prompt_id"]
    print("SUBMITTED %s prompt_id=%s" % (item["id"], prompt_id), flush=True)
    deadline = time.time() + 600
    while time.time() < deadline:
        try:
            hist = fetch(HOST + "/history/" + prompt_id)
        except urllib.error.HTTPError:
            time.sleep(2); continue
        if prompt_id in hist:
            out = hist[prompt_id]
            status = out.get("status", {})
            if status.get("status_str") == "error":
                print("GEN ERROR %s: %s" % (item["id"], status), flush=True)
                return None
            for nid, o in out.get("outputs", {}).items():
                for im in o.get("images", []):
                    sub = im.get("subfolder", "")
                    rel = (sub + "/" if sub else "") + im.get("filename", "")
                    print("DONE %s %s" % (item["id"], rel), flush=True)
                    return rel
            return None
        time.sleep(2)
    print("TIMEOUT %s" % item["id"], flush=True)
    return None


if __name__ == "__main__":
    manifest_path = sys.argv[1]
    wanted = sys.argv[2:] or ["ALL"]
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    items = manifest["images"]
    if wanted != ["ALL"]:
        items = [it for it in items if it["id"] in wanted]
    ok = 0
    for i, it in enumerate(items):
        seed = SEED_BASE + i * 7919
        res = gen_one(it, seed)
        if res:
            ok += 1
    print("BATCH SUMMARY: %d/%d succeeded" % (ok, len(items)), flush=True)
