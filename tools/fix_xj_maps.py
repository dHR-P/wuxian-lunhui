# -*- coding: utf-8 -*-
# Fix map rows in xingjichuanqi.rs to exactly 40 chars by adjusting trailing dot run.
import re, sys

path = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src\worlds\xingjichuanqi.rs"
src = open(path, encoding="utf-8").read()

def fix_row(s):
    if len(s) == 40:
        return s, True
    # Edge borders must be # (first and last char). Interior padding via dots.
    if not s.startswith('#') or not s.endswith('#'):
        return s, False
    inner = s[1:-1]
    cur = len(inner)
    target = 38
    # Find trailing run of dots to extend/trim
    m = re.match(r'^(.*?)(\.+)$', inner)
    if m:
        head, dots = m.group(1), m.group(2)
        nd = target - len(head)
        if nd < 0:
            return None, False
        new_inner = head + ('.' * nd)
        new = '#' + new_inner + '#'
        return (new, len(new) == 40)
    # If no trailing dots, can't pad -> report
    return (None, False)

out_lines = []
bad = 0
for line in src.splitlines():
    t = line.strip()
    m = re.match(r'^"([^"]*)"', t)
    if m:
        content = m.group(1)
        if content and not content.strip():
            pass
        if re.match(r'^[#.\x20I TGC?*P]+$', content) and '""' not in content and ',' not in content.replace(',', '', 1):
            if len(content) > 1 and content[0]=='#' and content[-1]=='#':
                nr, ok = fix_row(content)
                if ok and nr is not None:
                    q = t.replace('"'+content+'"', '"'+nr+'"')
                    out_lines.append(q)
                    continue
                else:
                    bad += 1
                    out_lines.append(t)
                    continue
    out_lines.append(t)

open(path, "w", encoding="utf-8").write("\n".join(out_lines) + "\n")
print("lines=", len(out_lines), "unfixed=", bad)