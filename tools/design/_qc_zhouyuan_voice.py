# -*- coding: utf-8 -*-
"""《咒怨》配音暂存质检：文件存在 / >0字节 / 时长>0.5s。"""
import os, soundfile as sf

D = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\audio_zhouyuan"
files = sorted(f for f in os.listdir(D) if f.endswith(".wav"))
print("count:", len(files))
allok = True
for f in files:
    p = os.path.join(D, f)
    info = sf.info(p)
    ok = info.duration > 0.5 and os.path.getsize(p) > 0
    allok = allok and ok
    print("%-28s %9dB  %6.2fs  sr=%d  %s  QC=%s" % (
        f, os.path.getsize(p), info.duration, info.samplerate,
        info.subtype, "OK" if ok else "FAIL"))
print("\nALL_OK" if allok else "\nHAS_FAIL")