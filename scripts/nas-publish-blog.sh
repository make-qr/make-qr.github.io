#!/usr/bin/env bash
# Daily Make QR blog publisher for NAS / Linux cron (Asia/Ho_Chi_Minh).
# Moves due drafts → live blog/, rebuilds index + sitemap, optionally git push.
set -euo pipefail

REPO="${MAKE_QR_REPO:-/home/vananh/NAS/projects/personal/make-qr/make-qr.github.io}"
LOG_DIR="${MAKE_QR_BLOG_LOG:-$REPO/scripts/logs}"
AUTO_PUSH="${MAKE_QR_BLOG_PUSH:-1}"
BRANCH="${MAKE_QR_BLOG_BRANCH:-master}"

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/blog-publish-$(date +%F).log"
exec >>"$LOG" 2>&1

echo "==== $(date -Is) start ===="
cd "$REPO"

python3 scripts/publish_blog.py

# If nothing staged-worthy, still ok
if [[ -n "$(git status --porcelain blog assets/js/template-loader.js sitemap.xml 2>/dev/null || true)" ]]; then
  git add blog assets/js/template-loader.js sitemap.xml
  # Only commit when there is a due post or index/sitemap change
  if ! git diff --cached --quiet; then
    MSG="Publish scheduled Make QR guides ($(TZ=Asia/Ho_Chi_Minh date +%F))"
    git commit -m "$MSG"
    if [[ "$AUTO_PUSH" == "1" ]]; then
      git push origin "$BRANCH"
      echo "Pushed to origin/$BRANCH"
    else
      echo "Commit created; AUTO_PUSH=0 so push skipped"
    fi
  fi
else
  echo "No blog file changes"
fi

echo "==== $(date -Is) done ===="
