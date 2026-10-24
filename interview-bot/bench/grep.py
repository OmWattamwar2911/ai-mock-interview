import re, sys
p = sys.argv[1]
pats = [re.compile(a) for a in sys.argv[2:]]
for i, l in enumerate(open(p, encoding="utf-8"), 1):
    if any(q.search(l) for q in pats):
        print(f"{i}: {l.rstrip()[:140]}")
