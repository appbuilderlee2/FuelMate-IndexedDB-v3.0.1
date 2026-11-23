#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/FuelMate.xcarchive \
  CODE_SIGNING_ALLOWED=NO archive
STAGING=$(mktemp -d "$PWD/build/ipa.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
mkdir -p "$STAGING/Payload"
ditto build/FuelMate.xcarchive/Products/Applications/FuelMate.app "$STAGING/Payload/FuelMate.app"
rm -f dist/FuelMate-unsigned.ipa
ditto -c -k --keepParent "$STAGING/Payload" dist/FuelMate-unsigned.ipa
echo "Unsigned IPA: $PWD/dist/FuelMate-unsigned.ipa"
ls -lh dist/FuelMate-unsigned.ipa
