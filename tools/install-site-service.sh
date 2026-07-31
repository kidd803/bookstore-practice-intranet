#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/kidd803/Documents/林宜毅臉書內網"
PLIST_NAME="com.linyiyi.facebook-site.plist"
SOURCE_PLIST="$PROJECT_DIR/tools/$PLIST_NAME"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$TARGET_DIR/$PLIST_NAME"
LABEL="com.linyiyi.facebook-site"
PORT="4174"

mkdir -p "$TARGET_DIR"
cp "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
fi

launchctl bootstrap "gui/$UID" "$TARGET_PLIST"
launchctl enable "gui/$UID/$LABEL"
launchctl kickstart -k "gui/$UID/$LABEL"

echo "已安裝並啟動林宜毅 Facebook 內網常駐服務"
echo "本機： http://127.0.0.1:$PORT/site/"
echo "手機： http://192.168.0.74:$PORT/site/"
