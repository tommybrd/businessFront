#!/bin/bash
# Publishes the current commit of `main`: pushes it to the code branch (flux-arcade) and copies the given files of dist/ to the
# public site (branch gh-pages, GitHub Pages), then waits for the deployment. Every module is requested with this publication's
# number (import map + script tag), so a visitor never gets a mix of old and new files (GitHub Pages caches files 10 minutes).
# Usage: scripts/publish.sh "message" file1.js file2.html ...
set -e
cd "$(dirname "$0")/.."
MSG="$1"; shift
WT="${PUBLISH_DIR:-${TMPDIR:-/tmp}/marketfront-gh-pages}"
git worktree prune
[ -e "$WT/.git" ] || { git fetch -q github gh-pages && git worktree add -q -B gh-pages "$WT" github/gh-pages; }
AE=$(git log -1 --format='%ae'); VER=$(git rev-parse --short HEAD)
git -C "$WT" fetch -q github gh-pages
for f in "$@"; do cp "dist/$f" "$WT/$f"; done
cp dist/arcade.html "$WT/index.html"
python3 - "$WT" "$VER" <<'PY'
import sys,re,glob,os,json
wt,ver=sys.argv[1:3]
mods=sorted(os.path.basename(f) for f in glob.glob(wt+'/*.js'))
for page in ('index.html','arcade.html','camping.html'):
    p=os.path.join(wt,page)
    if not os.path.exists(p): continue
    t=open(p,encoding='utf-8').read()
    t=re.sub(r'<script type="importmap">.*?</script>','<script type="importmap">'+json.dumps({"imports":{"three":"./vendor/three.module.js",**{'./'+m:'./'+m+'?v='+ver for m in mods}}})+'</script>',t,count=1,flags=re.S)
    t=re.sub(r'src="\./((?:arcade|camping)\.js)(?:\?v=\w+)?"',lambda m:'src="./'+m.group(1)+'?v='+ver+'"',t)
    open(p,'w',encoding='utf-8').write(t)
PY
git -C "$WT" add -A
git -C "$WT" -c user.name="Tommy Bourdin" -c user.email="$AE" commit -q -m "$MSG (site statique)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" || echo "rien à publier sur gh-pages"
GIT_TERMINAL_PROMPT=0 git push github main:flux-arcade 2>&1 | tail -1
GIT_TERMINAL_PROMPT=0 git -C "$WT" push github gh-pages:gh-pages 2>&1 | tail -1
SHA=$(git -C "$WT" rev-parse --short HEAD)
for i in $(seq 1 30); do R=$(gh run list -R tommybrd/businessfront -b gh-pages -L 1 --json headSha,status,conclusion --jq '.[0] | select(.headSha|startswith("'$SHA'")) | .status+"/"+.conclusion'); case "$R" in completed/*) break;; esac; sleep 10; done
echo "déploiement: $R"
