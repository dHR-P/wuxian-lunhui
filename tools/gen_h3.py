# -*- coding: utf-8 -*-
"""Generate one H3 T2VA clip by driving D:/AI_Tools/H3_Standard_Preset/control/minimax_h3_t2v_api.py.
Usage: python gen_h3.py <prompt_file_or_-> <dest_path.mp4> [seed]
Requires the H3 server (run_h3.py) already running on port 8192.
"""
import glob, os, shutil, subprocess, sys, time

PRESET = r"D:\AI_Tools\H3_Standard_Preset"
API_PY = os.path.join(PRESET, "engine", "python_embeded", "python.exe")
CTRL = os.path.join(PRESET, "control", "minimax_h3_t2v_api.py")
OUTDIR = os.path.join(PRESET, "output", "minimax_h3")


def newest_mp4(since_ts):
    cands = []
    for p in glob.glob(os.path.join(OUTDIR, "**", "*.mp4"), recursive=True):
        mt = os.path.getmtime(p)
        if mt >= since_ts - 2:
            cands.append((mt, p))
    return max(cands)[1] if cands else None


if __name__ == "__main__":
    src = sys.argv[1]
    dest = sys.argv[2]
    seed = sys.argv[3] if len(sys.argv) > 3 else None
    prompt = open(src, encoding="utf-8-sig").read().strip() if src != "-" else sys.stdin.read().strip()
    t0 = time.time()
    cmd = [API_PY, CTRL, "--prompt", prompt]
    if seed:
        cmd += ["832", "480", "124", "14", "3.0", seed]
    print("RUN:", " ".join(cmd[:6]), "...", flush=True)
    proc = subprocess.run(cmd, cwd=PRESET, capture_output=True, text=True,
                          encoding="utf-8", errors="replace",
                          timeout=900)
    print(proc.stdout[-2000:])
    if proc.returncode != 0:
        print("H3 STDERR:", proc.stderr[-2000:])
        sys.exit(proc.returncode)
    mp4 = newest_mp4(t0)
    if not mp4:
        print("NO OUTPUT MP4 FOUND")
        sys.exit(4)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(mp4, dest)
    print("COPIED %s -> %s" % (mp4, dest), flush=True)
