# -*- coding: utf-8 -*-
"""qc_parallel.py — 并发对多张 raw 图做质检。用法: python qc_parallel.py id1 id2 ...
输出 JSON {id: qc_result}
"""
import json, os, sys, concurrent.futures

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "raw_enemy")
sys.path.insert(0, HERE)
from qc import qc  # noqa: E402

def main():
    ids = sys.argv[1:]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(qc, os.path.join(RAW, cid + ".png"), "raw"): cid for cid in ids}
        res = {}
        for fut in concurrent.futures.as_completed(futs):
            cid = futs[fut]
            try:
                res[cid] = fut.result()
            except Exception as e:
                res[cid] = {"ok": False, "issues": ["exc %s" % e]}
            print("done %s -> ok=%s score=%s" % (cid, res[cid].get("ok"), res[cid].get("score")), flush=True)
    print("QC_PARALLEL: %s" % json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
