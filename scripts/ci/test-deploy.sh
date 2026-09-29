#!/bin/sh
# Run with bubblewrap, Git, GNU coreutils/findutils and util-linux on PATH.
# /srv is private to the namespace; the real site's files are never writable.
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
workspace=$(mktemp -d)
trap 'rm -rf -- "$workspace"' EXIT
mkdir -p "$workspace/site/releases" "$workspace/site/.staging" "$workspace/repo/scripts/ci"
cp "$SCRIPT_DIR/deploy.sh" "$workspace/repo/scripts/ci/"

bwrap --unshare-all --die-with-parent --ro-bind / / --dev /dev --proc /proc \
  --tmpfs /tmp --tmpfs /srv --bind "$workspace/site" /srv/www/floating-gate \
  --bind "$workspace/repo" /tmp/work --chdir /tmp/work sh -s <<'TEST'
set -eu
export HOME=/tmp
git init -q
git config user.name deployment-test
git config user.email deployment-test@example.invalid
git add scripts
git commit -qm initial
mkdir dist
echo first > dist/index.html
site=/srv/www/floating-gate
deploy() { sh scripts/ci/deploy.sh; }
unchanged() {
  test "$(readlink "$site/current")" = "releases/$first"
  test "$(cat "$site/current/index.html")" = first
}

first=$(git rev-parse HEAD)
deploy
unchanged
echo changed > dist/index.html
deploy
unchanged # An existing commit's immutable release is reused.

rm dist/index.html
if deploy; then exit 1; fi
unchanged
echo second > dist/index.html
if DEPLOY_COMMIT_SHA=invalid deploy; then exit 1; fi
unchanged

git commit --allow-empty -qm second
second=$(git rev-parse HEAD)
# Pause after copying the first file, then fail. No partial data may go live.
mkdir /tmp/bin
real_cp=$(command -v cp)
cat > /tmp/bin/cp <<EOF
#!/bin/sh
"$real_cp" "\$@"
touch /tmp/copy-started
while [ ! -f /tmp/finish-copy ]; do sleep 0.05; done
exit 1
EOF
chmod +x /tmp/bin/cp
PATH="/tmp/bin:$PATH" sh scripts/ci/deploy.sh >/tmp/deploy.log 2>&1 &
pid=$!
attempt=0
until [ -f /tmp/copy-started ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -gt 200 ]; then cat /tmp/deploy.log; exit 1; fi
  sleep 0.05
done
unchanged
touch /tmp/finish-copy
if wait "$pid"; then exit 1; fi
unchanged
test ! -e "$site/releases/$second"
test -z "$(find "$site/.staging" -mindepth 1 -print -quit)"

DEPLOY_RELEASES_TO_KEEP=1 deploy
test "$(readlink "$site/current")" = "releases/$second"
test "$(cat "$site/current/index.html")" = second
test ! -e "$site/releases/$first"
test -z "$(find "$site/.staging" -mindepth 1 -print -quit)"
echo 'Deployment checks passed: publication, reuse, failures, staging, retention.'
TEST
