#!/usr/bin/env bash
# Nový build Swift aplikace Kartičky do TestFlightu jedním příkazem, bez agenta.
#
#   scripts/testflight.sh          postaví aktuální origin/main s číslem buildu o 1 vyšším
#   scripts/testflight.sh 105      postaví s číslem 105
#
# Co udělá:
#   1. vytvoří dočasnou čistou kopii origin/main (tvoje složky ani složky agentů nemění),
#   2. zvýší CURRENT_PROJECT_VERSION ve swift/project.yml,
#   3. zkopíruje swift/Config/Secrets.xcconfig z této složky, pokud existuje (veřejná adresa
#      a klíč Supabase; bez něj aplikace běží bez účtů),
#   4. stáhne index obrázků karet (release scan-index) do aplikace,
#   5. xcodebuild archive a nahrání do App Store Connect,
#   6. pushne větev build-<číslo> a otevře PR do main s novým číslem buildu.
#
# Podepisování a nahrání jdou přes účet Apple přihlášený v Xcode (Nastavení → Účty).
# Build během 10–30 minut zpracuje Apple a v TestFlightu ho dostaneš sám (interní testování).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEAM="NL96UW5HVB"
SCHEME=Karticky
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

[[ $# -le 1 ]] || { echo "Použití: scripts/testflight.sh [číslo]"; exit 2; }

git -C "$ROOT" fetch -q origin main
SOURCE=$(git -C "$ROOT" rev-parse --verify "origin/main^{commit}")
COMMIT=$(git -C "$ROOT" rev-parse --short "$SOURCE")
CURRENT=$(git -C "$ROOT" show "$SOURCE:swift/project.yml" | sed -n "s/.*CURRENT_PROJECT_VERSION: '\([0-9]*\)'.*/\1/p")
BUILD="${1:-$((CURRENT + 1))}"
[[ "$BUILD" =~ ^[1-9][0-9]*$ ]] || { echo "Číslo buildu musí být kladné celé číslo."; exit 2; }
[[ "$BUILD" -gt "$CURRENT" ]] || { echo "Číslo buildu musí být větší než $CURRENT."; exit 1; }

WORK="$(mktemp -d /tmp/karticky-build-XXXX)"
LOG="$WORK/build.log"
cleanup() { git -C "$ROOT" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Kartičky ($BUILD), commit $COMMIT. Výpis: $LOG"
git -C "$ROOT" worktree add -q -b "build-$BUILD" "$WORK/repo" "$SOURCE"
cd "$WORK/repo/swift"
sed -i '' "s/CURRENT_PROJECT_VERSION: '[0-9]*'/CURRENT_PROJECT_VERSION: '$BUILD'/" project.yml
if [[ -f "$ROOT/swift/Config/Secrets.xcconfig" ]]; then
  cp "$ROOT/swift/Config/Secrets.xcconfig" Config/Secrets.xcconfig
else
  echo "Bez swift/Config/Secrets.xcconfig: aplikace poběží bez účtů."
fi

printf '%-12s' "Index karet"
if gh release download scan-index -R jakubcabalek/karticky -p scan-index-v1.bin -D Karticky/Resources >>"$LOG" 2>&1; then
  echo "✓"
else
  echo "– (není, skenování podle obrázku nepůjde)"
fi

xcodegen generate --quiet

cat >"$WORK/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$TEAM</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
PLIST

printf '%-12s' "Archiv"
if xcodebuild archive -project Karticky.xcodeproj -scheme "$SCHEME" -configuration Release \
    -destination "generic/platform=iOS" -archivePath "$WORK/Karticky.xcarchive" \
    -allowProvisioningUpdates -quiet >>"$LOG" 2>&1; then
  echo "✓"
else
  echo "✗"; grep -E "error:" "$LOG" | sort -u | head -n 20 || true; echo "Celý výpis: $LOG"; trap - EXIT; exit 1
fi

printf '%-12s' "Nahrání"
if xcodebuild -exportArchive -archivePath "$WORK/Karticky.xcarchive" \
    -exportOptionsPlist "$WORK/ExportOptions.plist" -exportPath "$WORK/export" \
    -allowProvisioningUpdates >>"$LOG" 2>&1 && grep -q -i "upload succeeded\|EXPORT SUCCEEDED" "$LOG"; then
  echo "✓"
else
  echo "✗"; grep -E -i "error|failed" "$LOG" | sort -u | head -n 20 || true; echo "Celý výpis: $LOG"; trap - EXIT; exit 1
fi

cd "$WORK/repo"
git add swift/project.yml
git commit -q -m "Swift: build $BUILD do TestFlightu (z main $COMMIT)"
git push -q -u origin "build-$BUILD" 2>/dev/null
if command -v gh >/dev/null; then
  gh pr create --base main --head "build-$BUILD" \
    --title "Swift: build $BUILD v TestFlightu" \
    --body "Build **($BUILD)** nahraný do App Store Connect skriptem \`scripts/testflight.sh\` z \`main\` $COMMIT. Mění jen číslo buildu ve \`swift/project.yml\`." >/dev/null \
    && echo "Pull request s číslem buildu je otevřený."
fi
cleanup; trap - EXIT
git -C "$ROOT" branch -D "build-$BUILD" >/dev/null 2>&1 || true
rm -rf "$WORK"

echo "Hotovo: build $BUILD je v App Store Connect. Za 10–30 minut ho uvidíš v TestFlightu."
