#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "请在 Mac 上运行此脚本；需要 Xcode Command Line Tools。" >&2
  exit 1
fi
APP="$PWD/build/大喝特喝.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/BarWeb"
cp macOS/Info.plist "$APP/Contents/Info.plist"
cp macOS/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"
cp -R Cocktail60/BarWeb/. "$APP/Contents/Resources/BarWeb/"
xcrun swiftc macOS/main.swift Cocktail60/BarWebHost.swift \
  -target "$(uname -m)-apple-macosx13.0" \
  -framework AppKit -framework WebKit -O \
  -o "$APP/Contents/MacOS/DrinkDrinkDrunk"
# iCloud/Finder xattrs break ad-hoc codesign
xattr -cr "$APP" 2>/dev/null || true
find "$APP" -name '._*' -delete 2>/dev/null || true
codesign --force --deep --sign - "$APP"
echo "已构建：$APP"
open "$APP"
