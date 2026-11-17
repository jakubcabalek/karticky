#!/usr/bin/env bash
# Všechny kontroly Swiftu jedním příkazem, s krátkým výstupem.
# Celé výpisy jdou do swift/build/check/*.log; na obrazovku jen výsledek a u chyby
# ty řádky, které ji popisují. Agent tak nečte stovky řádků (šetří tokeny).
#
#   scripts/swift-check.sh            lint + KartickyCore + testy aplikace + UI testy
#   scripts/swift-check.sh --fast     bez UI testů (rychlá kontrola během práce)
#   scripts/swift-check.sh --core     jen KartickyCore (swift test)
#   scripts/swift-check.sh --record   přenahraje referenční snímky (KARTICKY_RECORD_SNAPSHOTS=1)
#
# Simulátor: KARTICKY_SIM (výchozí „iPhone 18 Pro“). Když simulátor s tím jménem
# neexistuje, vytvoří se z typu iPhone 18 Pro (CI používá vlastní „Karticky CI“,
# aby se nepletl agentům).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SWIFT="$ROOT/swift"
LOGS="$SWIFT/build/check"
SIM="${KARTICKY_SIM:-iPhone 18 Pro}"
MODE="full"
RECORD=""
for arg in "$@"; do
  case "$arg" in
    --fast) MODE="fast" ;;
    --core) MODE="core" ;;
    --record) RECORD="1" ;;
    *) echo "Neznámý přepínač: $arg"; exit 2 ;;
  esac
done

mkdir -p "$LOGS"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.mint/bin:$PATH"
FAILED=0
START=$(date +%s)

step() { printf '%-28s' "$1"; }
ok() { echo "✓ $1"; }
fail() {
  echo "✗ $1 (celý výpis: ${2#$ROOT/})"
  FAILED=1
}

# Řádky, které popisují chybu: překladač, SwiftLint, XCTest, swift-testing, snímky.
errors_from() {
  grep -E "error:|warning: .*\(.*\)$|: failed|failed \(|✘|Test Case .* failed|Snapshot .* does not match|XCTAssert|recorded snapshot" "$1" \
    | grep -v "^\s*$" | sed "s#$ROOT/##g" | sort -u | head -n 30
}

cd "$SWIFT" || exit 1

if [ "$MODE" != "core" ]; then
  step "XcodeGen"
  if xcodegen generate --quiet >"$LOGS/xcodegen.log" 2>&1; then ok "projekt"; else fail "projekt" "$LOGS/xcodegen.log"; errors_from "$LOGS/xcodegen.log"; exit 1; fi

  step "SwiftLint"
  if mint run swiftlint lint --strict --quiet >"$LOGS/swiftlint.log" 2>&1; then
    ok "0 nálezů"
  else
    fail "$(grep -c "error:\|warning:" "$LOGS/swiftlint.log") nálezů" "$LOGS/swiftlint.log"
    errors_from "$LOGS/swiftlint.log"
  fi
fi

step "KartickyCore (swift test)"
if swift test --package-path KartickyCore >"$LOGS/core.log" 2>&1; then
  # swift-testing hlásí „Test run with N tests“, XCTest „Executed N tests“; sečíst obojí.
  CORE_TESTS=$(( $(grep -Eo "Test run with [0-9]+ tests?" "$LOGS/core.log" | grep -Eo "[0-9]+" | tail -n 1 || echo 0) \
    + $(grep -Eo "Executed [0-9]+ tests?" "$LOGS/core.log" | grep -Eo "[0-9]+" | tail -n 1 || echo 0) ))
  ok "$CORE_TESTS testů, $(grep -Eo "cases.json: [0-9]+ executed of [0-9]+" "$LOGS/core.log" | grep -Eo "[0-9]+ executed of [0-9]+" | sed 's/ executed of /\//' | head -n 1) případů z fixture"
else
  fail "selhalo" "$LOGS/core.log"
  errors_from "$LOGS/core.log"
fi

if [ "$MODE" != "core" ]; then
  if ! xcrun simctl list devices available | grep -q "    $SIM ("; then
    xcrun simctl create "$SIM" "iPhone 18 Pro" >/dev/null 2>&1 || { echo "Simulátor „$SIM“ nejde vytvořit (chybí iPhone 18 Pro v Xcode?)"; exit 1; }
  fi
  SKIP=()
  # (UI testy zatím nejsou; --fast se liší jen tím, že se dá přidat později)
  RESULT="$LOGS/app.xcresult"
  rm -rf "$RESULT"
  step "Aplikace (xcodebuild test)"
  if TEST_RUNNER_KARTICKY_RECORD_SNAPSHOTS="$RECORD" xcodebuild test \
      -project Karticky.xcodeproj -scheme Karticky \
      -destination "platform=iOS Simulator,name=$SIM" \
      -resultBundlePath "$RESULT" ${SKIP[@]+"${SKIP[@]}"} -quiet >"$LOGS/app.log" 2>&1; then
    PASSED=$(xcrun xcresulttool get test-results summary --path "$RESULT" 2>/dev/null \
      | python3 -c 'import json, sys; print(json.load(sys.stdin).get("passedTests", "?"))' 2>/dev/null || echo "?")
    ok "$PASSED testů prošlo"
  else
    fail "selhalo" "$LOGS/app.log"
    # Názvy selhaných testů a jejich zprávy z výsledků, jinak z výpisu.
    if xcrun xcresulttool get test-results summary --path "$RESULT" >"$LOGS/summary.json" 2>/dev/null; then
      python3 - "$LOGS/summary.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(f"  {d.get('passedTests', '?')} prošlo, {d.get('failedTests', '?')} selhalo")
for f in d.get("testFailures", [])[:20]:
    text = f.get('failureText', '').strip().splitlines()
    print(f"  - {f.get('testName', '?')}: {(text[0] if text else '')[:200]}")
PY
    else
      errors_from "$LOGS/app.log"
    fi
  fi
fi

echo "Hotovo za $(( $(date +%s) - START )) s. Commit $(git -C "$ROOT" rev-parse --short HEAD)."
exit $FAILED
