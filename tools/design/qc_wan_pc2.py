# -*- coding: utf-8 -*-
import base64
import json
import time
import urllib.request

IMG_PATH = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\pc_wan2.png"
API_KEY = "sk_tr_kHjpemePYfJLpsejXmebJsJH8kQHnz-vmXp5JoqG9AQ"
URL = "https://tokenrhythm.studio/v1/chat/completions"

prompt = """你是一位资深游戏美术视觉质检员。请逐项核验下面这张角色立绘(怪物「挣扎者」设定:中国青年男性灾难幸存者变异体,破旧工装,四肢扭曲,丧尸化,纯黑背景,全身像,脚底贴画面底缘,768x1024,用于2D行走动画序列帧)：
1. 全身是否完整在画面内,无裁剪(尤其头顶与脚底)?
2. 脚部是否贴底缘(底部留白是否近乎为0)?双脚是否完整、轮廓清晰可辨?
3. 双手/手指是否清晰分开,无粘连模糊?
4. 躯干/四肢是否造型饱满(非细线/剪影),肢体是否有扭曲感符合丧尸变异设定?
5. 背景是否纯黑干净,无残留白框、光晕、噪点、文字?
6. 主体横向是否撑满全宽(0-767px):是肢体合理向两侧伸出(可接受)还是边缘有脏东西/杂光(需修)?
7. 整体光影是否自然(无过曝/全黑死区)?
请对每一项给出结论并说明理由,最后给出总体判定:「可发布」或「需重生成」,若需重生成请给出1-2句prompt修正要点。"""


def build_payload():
    with open(IMG_PATH, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return {
        "model": "qwen3.7-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": "data:image/png;base64," + b64},
                    },
                ],
            }
        ],
        "max_tokens": 4000,
    }


def call_once():
    body = json.dumps(build_payload()).encode("utf-8")
    req = urllib.request.Request(URL, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + API_KEY)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def main():
    last_err = None
    # retry loop for 504 and transient errors
    for attempt in range(1, 4):
        try:
            status, data = call_once()
            print("STATUS", status)
            if status == 200:
                msg = data["choices"][0]["message"]
                content = msg.get("content") or ""
                reasoning = msg.get("reasoning_content") or ""
                result = content if content.strip() else reasoning
                out = {
                    "api_ok": True,
                    "status": status,
                    "content": content.strip(),
                    "reasoning": reasoning.strip(),
                }
                with open(
                    r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_wan_pc2_result.json",
                    "w",
                    encoding="utf-8",
                ) as wf:
                    json.dump(out, wf, ensure_ascii=False, indent=2)
                print("RESULT_START")
                print(result)
                print("RESULT_END")
                return
            else:
                last_err = "http %s: %s" % (status, json.dumps(data)[:500])
                print("non200", status, json.dumps(data)[:500])
                if status == 429:
                    print("429 sleeping 15s")
                    time.sleep(15)
                    # for 429 allow more attempts: loop up to 5 total handled by external
                elif status == 504:
                    print("504 sleeping 5s")
                    time.sleep(5)
                else:
                    break
        except urllib.error.HTTPError as e:
            code = e.code
            last_err = "HTTPError %s: %s" % (code, e.read().decode("utf-8", "replace")[:500])
            print("HTTPError", code, last_err)
            if code == 429:
                print("429 sleeping 15s")
                time.sleep(15)
            elif code == 504:
                print("504 sleeping 5s")
                time.sleep(5)
            else:
                time.sleep(3)
        except Exception as e:
            last_err = repr(e)
            print("EXC", last_err)
            time.sleep(3)
    on_err = {"api_ok": False, "error": last_err}
    with open(
        r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_wan_pc2_result.json",
        "w",
        encoding="utf-8",
    ) as wf:
        json.dump(on_err, wf, ensure_ascii=False, indent=2)
    print("FAILED", last_err)


if __name__ == "__main__":
    main()