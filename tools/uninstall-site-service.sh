#!/bin/zsh
set -euo pipefail

PLIST_NAME="com.linyiyi.facebook-site.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$PLIST_NAME"
LABEL="com.linyiyi.facebook-site"

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
rm -f "$TARGET_PLIST"

echo "已移除林宜毅 Facebook 內網常駐服務"
